<?php

namespace App\Services\Ledger;

use App\Models\Driver;
use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\User;
use DomainException;

/**
 * Records PickU paying a driver out - the reverse of DriverSettlementService.
 * The driver's ledger account is positive (PickU owes them, typically from
 * card/wallet rides) and an operator sends a bank transfer to clear it.
 */
class DriverPayoutService
{
    public function __construct(
        private readonly LedgerService $ledger,
    ) {}

    public function record(
        Driver $driver,
        string $amount,
        string $note,
        User $createdBy,
        string $reference,
    ): JournalEntry {
        $account = DriverAccount::forDriver((int) $driver->id)->load('ledgerAccount');
        $owed = $account->balance();

        if (Money::isNegative($owed) || Money::isZero($owed)) {
            throw new DomainException('This driver has no payout balance owing.');
        }

        if (Money::cmp($amount, $owed) > 0) {
            throw new DomainException("Payout amount exceeds the {$owed} PickU currently owes this driver.");
        }

        return $this->ledger->post(
            type: JournalEntry::TYPE_PAYOUT_PAID,
            idempotencyKey: "driver-payout:{$reference}",
            description: "Driver payout: {$note}",
            lines: [
                ['account' => LedgerAccount::codeForDriver((int) $driver->id), 'debit' => $amount],
                ['account' => 'BANK', 'credit' => $amount],
            ],
            reference: $account,
            createdBy: $createdBy->id,
        );
    }
}
