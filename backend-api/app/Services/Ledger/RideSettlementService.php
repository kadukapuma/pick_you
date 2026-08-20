<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\LoyaltyPointTransaction;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\Ride;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Turns a completed payment into the journal entry that moves the commission.
 *
 * Cash: only the commission moves through the books - the fare passed hand to
 * hand and never entered PickU's custody.
 *
 * Card/wallet: the gross passes through PickU, which keeps the commission and
 * owes the driver the remainder.
 *
 * Split payments: completed payment allocations determine which accounts
 * supplied the fare, including PickU credit, card, and cash.
 */
class RideSettlementService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly CommissionService $commission,
    ) {}

    public function settle(Payment $payment): ?JournalEntry
    {
        if ($payment->payment_status !== 'COMPLETED') {
            throw new DomainException(
                'Only completed payments can be settled.'
            );
        }

        $ride = $payment->ride()->firstOrFail();

        if (! $ride->driver_id) {
            throw new DomainException(
                'Cannot settle a ride with no driver.'
            );
        }

        if (! $this->commission->appliesTo($ride)) {
            return null;
        }

        $gross = Money::of($payment->amount);

        if (Money::isZero($gross)) {
            return null;
        }

        // The actual money that moved is the discounted gross (loyalty points
        // already reduced final_fare before the payment was created). Commission
        // and driver earning are computed on the pre-discount fare so the
        // driver's earning is never affected by a passenger's points - see
        // resolveLoyaltyDiscount().
        $pointsUsed = Money::of($ride->loyalty_points_used ?? '0.00');
        $fareBeforeDiscount = Money::add($gross, $pointsUsed);

        $computed = $this->commission->computeFor(
            $ride,
            $fareBeforeDiscount
        );

        [$commissionFinal, $discountExcess] = $this->resolveLoyaltyDiscount(
            $computed['commission'],
            $pointsUsed
        );

        // driver_earning stays as computed above (based on the pre-discount
        // fare); gross/commission are overridden to what settlement actually
        // needs to move: the real money collected, and the commission PickU
        // keeps after the points discount eats into it.
        $computed['gross'] = $gross;
        $computed['commission'] = $commissionFinal;

        $driverCode = LedgerAccount::codeForDriver(
            (int) $ride->driver_id
        );

        // Ensure the driver has an account row so credit limits are
        // enforceable from the first ride onwards.
        DriverAccount::forDriver(
            (int) $ride->driver_id
        );

        $method = $ride->payment_method
            ?: $payment->payment_method;

        $lines = $this->linesForPayment(
            $payment,
            $method,
            $driverCode,
            $computed,
            $discountExcess
        );

        $entry = $this->ledger->post(
            type: JournalEntry::TYPE_RIDE_SETTLEMENT,
            idempotencyKey: "ride:{$ride->id}:settlement",
            description: "Ride {$ride->ride_code} settled ({$method})",
            lines: $lines,
            reference: $payment,
            gateway: $payment->gateway,
        );

        // Snapshot values onto the ride so a later commission-rate change
        // never rewrites the historical settlement.
        DB::table('rides')
            ->where('id', $ride->id)
            ->update([
                'commission_rate' => $computed['rate'],
                'commission_amount' => $computed['commission'],
                'driver_earning' => $computed['driver_earning'],
                'updated_at' => now(),
            ]);

        $this->awardStudentLoyaltyPoints($ride, $computed['commission']);

        return $entry;
    }

    /**
     * A student's loyalty-point discount comes out of PickU's own commission,
     * never the driver's earning. When the discount is larger than this ride's
     * commission, the excess is booked as a company expense instead of ever
     * touching the driver's payout.
     *
     * @return array{0: string, 1: string} [commissionAfterDiscount, excessBeyondCommission]
     */
    private function resolveLoyaltyDiscount(string $commissionBeforeDiscount, string $pointsUsed): array
    {
        if (Money::isZero($pointsUsed)) {
            return [$commissionBeforeDiscount, '0.00'];
        }

        $remaining = Money::sub($commissionBeforeDiscount, $pointsUsed);

        if (Money::isNegative($remaining)) {
            return ['0.00', Money::negate($remaining)];
        }

        return [$remaining, '0.00'];
    }

    /**
     * The commission that PickU would otherwise have kept as revenue is
     * instead credited to the passenger as loyalty points, but only while
     * their student verification is approved at the moment of settlement -
     * rides taken while an application is still pending never accrue points.
     */
    private function awardStudentLoyaltyPoints(Ride $ride, string $commission): void
    {
        if (Money::isZero($commission)) {
            return;
        }

        $passenger = $ride->passenger()->with('studentVerification')->first();

        if (! $passenger?->isVerifiedStudent()) {
            return;
        }

        $passenger->increment('loyalty_points_balance', $commission);

        LoyaltyPointTransaction::create([
            'passenger_id' => $passenger->id,
            'ride_id' => $ride->id,
            'type' => LoyaltyPointTransaction::TYPE_EARNED,
            'points' => $commission,
            'created_at' => now(),
        ]);
    }

    /**
     * Build settlement lines from completed allocations when a payment is
     * split between PickU credit, card, and cash.
     *
     * @param array{
     *     rate: string,
     *     gross: string,
     *     commission: string,
     *     driver_earning: string
     * } $computed
     * @return array<int, array{
     *     account: string,
     *     debit?: string,
     *     credit?: string
     * }>
     */
    private function linesForPayment(
        Payment $payment,
        string $method,
        string $driverCode,
        array $computed,
        string $discountExcess = '0.00',
    ): array {
        $allocations = $payment->allocations()
            ->where(
                'status',
                PaymentAllocation::STATUS_COMPLETED
            )
            ->orderBy('id')
            ->get();

        /*
         * Existing single-method payments may not have allocation records.
         * Fall back to the original settlement logic in that case.
         */
        if ($allocations->isEmpty()) {
            return $this->linesFor(
                $method,
                $driverCode,
                $computed,
                $discountExcess
            );
        }

        $allocatedTotal = '0.00';

        foreach ($allocations as $allocation) {
            $allocatedTotal = Money::add(
                $allocatedTotal,
                (string) $allocation->amount
            );
        }

        if (
            Money::cmp(
                $allocatedTotal,
                $computed['gross']
            ) !== 0
        ) {
            throw new DomainException(
                'Completed payment allocations must equal the payment amount.'
            );
        }

        $lines = [];
        $cashAmount = '0.00';

        foreach ($allocations as $allocation) {
            $amount = Money::of(
                $allocation->amount
            );

            if (
                $allocation->type
                === PaymentAllocation::TYPE_PICKU_CREDIT
            ) {
                $lines[] = [
                    'account' => 'PASSENGER_WALLET_LIABILITY',
                    'debit' => $amount,
                ];

                continue;
            }

            if (
                $allocation->type
                === PaymentAllocation::TYPE_CARD
            ) {
                $lines[] = [
                    'account' => 'GATEWAY_RECEIVABLE',
                    'debit' => $amount,
                ];

                continue;
            }

            if (
                $allocation->type
                === PaymentAllocation::TYPE_CASH
            ) {
                $cashAmount = Money::add(
                    $cashAmount,
                    $amount
                );

                continue;
            }

            throw new DomainException(
                "Unsupported payment allocation type: {$allocation->type}."
            );
        }

        $lines[] = [
            'account' => 'REVENUE_COMMISSION',
            'credit' => $computed['commission'],
        ];

        /*
         * The driver already physically holds the cash allocation.
         * Subtract that amount from the total earning owed to the driver.
         *
         * A positive adjustment means PickU still owes the driver.
         * A negative adjustment means the driver owes PickU.
         */
        $driverAdjustment = Money::sub(
            $computed['driver_earning'],
            $cashAmount
        );

        if (Money::isNegative($driverAdjustment)) {
            $lines[] = [
                'account' => $driverCode,
                'debit' => Money::negate(
                    $driverAdjustment
                ),
            ];
        } elseif (! Money::isZero($driverAdjustment)) {
            $lines[] = [
                'account' => $driverCode,
                'credit' => $driverAdjustment,
            ];
        }

        if (! Money::isZero($discountExcess)) {
            $lines[] = [
                'account' => 'STUDENT_LOYALTY_DISCOUNT_EXPENSE',
                'debit' => $discountExcess,
            ];
        }

        return $lines;
    }

    /**
     * Build settlement lines for legacy or single-method payments.
     *
     * @param array{
     *     rate: string,
     *     gross: string,
     *     commission: string,
     *     driver_earning: string
     * } $computed
     * @return array<int, array{
     *     account: string,
     *     debit?: string,
     *     credit?: string
     * }>
     */
    private function linesFor(
        string $method,
        string $driverCode,
        array $computed,
        string $discountExcess = '0.00',
    ): array {
        if ($method === 'cash') {
            /*
             * Normally: the driver already holds the full fare in cash, so the
             * driver owes PickU only the commission.
             *
             * When a student's points discount is larger than this ride's
             * commission (discountExcess > 0), the driver holds less cash than
             * their protected earning - PickU tops them up out of pocket
             * instead, via the loyalty discount expense account.
             */
            if (! Money::isZero($discountExcess)) {
                return [
                    [
                        'account' => 'STUDENT_LOYALTY_DISCOUNT_EXPENSE',
                        'debit' => $discountExcess,
                    ],
                    [
                        'account' => $driverCode,
                        'credit' => $discountExcess,
                    ],
                ];
            }

            return [
                [
                    'account' => $driverCode,
                    'debit' => $computed['commission'],
                ],
                [
                    'account' => 'REVENUE_COMMISSION',
                    'credit' => $computed['commission'],
                ],
            ];
        }

        $source = match ($method) {
            'card' => 'GATEWAY_RECEIVABLE',
            'wallet' => 'PASSENGER_WALLET_LIABILITY',

            default => throw new DomainException(
                "Unsupported payment method for settlement: {$method}."
            ),
        };

        /*
         * PickU holds the gross amount, keeps the commission, and owes the
         * remaining driver earning to the driver. If the points discount ate
         * into more than the commission, the excess is an extra debit so the
         * driver still gets their full, undiscounted earning.
         */
        $lines = [
            [
                'account' => $source,
                'debit' => $computed['gross'],
            ],
            [
                'account' => 'REVENUE_COMMISSION',
                'credit' => $computed['commission'],
            ],
            [
                'account' => $driverCode,
                'credit' => $computed['driver_earning'],
            ],
        ];

        if (! Money::isZero($discountExcess)) {
            $lines[] = [
                'account' => 'STUDENT_LOYALTY_DISCOUNT_EXPENSE',
                'debit' => $discountExcess,
            ];
        }

        return $lines;
    }
}
