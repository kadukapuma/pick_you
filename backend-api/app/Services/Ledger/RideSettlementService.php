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

        $computed = $this->commission->computeFor(
            $ride,
            $gross
        );

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
            $computed
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
                $computed
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
        array $computed
    ): array {
        if ($method === 'cash') {
            /*
             * The driver already holds the full fare, so the driver owes PickU
             * only the commission.
             */
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
         * remaining driver earning to the driver.
         */
        return [
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
    }
}
