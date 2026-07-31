<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\Payment;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Turns a completed payment into the journal entry that moves the commission.
 *
 * Cash: only the commission moves through the books - the fare passed hand to
 * hand and never entered PickU's custody.
 * Card/wallet: the gross passes through PickU, which keeps the commission and
 * owes the driver the remainder.
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
            throw new DomainException('Only completed payments can be settled.');
        }

        $ride = $payment->ride()->firstOrFail();

        if (! $ride->driver_id) {
            throw new DomainException('Cannot settle a ride with no driver.');
        }

        if (! $this->commission->appliesTo($ride)) {
            return null;
        }

        $gross = Money::of($payment->amount);

        if (Money::isZero($gross)) {
            return null;
        }

        $computed = $this->commission->computeFor($ride, $gross);
        $driverCode = LedgerAccount::codeForDriver((int) $ride->driver_id);

        // Ensure the driver has an account row so credit limits are enforceable
        // from the first ride onwards.
        DriverAccount::forDriver((int) $ride->driver_id);

        $method = $ride->payment_method ?: $payment->payment_method;
        $lines = $this->linesFor($method, $driverCode, $computed);

        $entry = $this->ledger->post(
            type: JournalEntry::TYPE_RIDE_SETTLEMENT,
            idempotencyKey: "ride:{$ride->id}:settlement",
            description: "Ride {$ride->ride_code} settled ({$method})",
            lines: $lines,
            reference: $payment,
            gateway: $payment->gateway,
        );

        // Snapshot onto the ride so a later rate change never rewrites history.
        DB::table('rides')->where('id', $ride->id)->update([
            'commission_rate' => $computed['rate'],
            'commission_amount' => $computed['commission'],
            'driver_earning' => $computed['driver_earning'],
            'updated_at' => now(),
        ]);

        return $entry;
    }

    /**
     * @param  array{rate: string, gross: string, commission: string, driver_earning: string}  $computed
     * @return array<int, array{account: string, debit?: string, credit?: string}>
     */
    private function linesFor(string $method, string $driverCode, array $computed): array
    {
        if ($method === 'cash') {
            // Driver already holds the full fare, so they owe us the commission.
            return [
                ['account' => $driverCode, 'debit' => $computed['commission']],
                ['account' => 'REVENUE_COMMISSION', 'credit' => $computed['commission']],
            ];
        }

        $source = match ($method) {
            'card' => 'GATEWAY_RECEIVABLE',
            'wallet' => 'PASSENGER_WALLET_LIABILITY',
            default => throw new DomainException("Unsupported payment method for settlement: {$method}."),
        };

        // PickU holds the gross and owes the driver everything but the commission.
        return [
            ['account' => $source, 'debit' => $computed['gross']],
            ['account' => 'REVENUE_COMMISSION', 'credit' => $computed['commission']],
            ['account' => $driverCode, 'credit' => $computed['driver_earning']],
        ];
    }
}
