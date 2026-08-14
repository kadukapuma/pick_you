<?php

namespace App\Services\Ledger;

use App\Models\Driver;
use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\User;

/**
 * Records a driver's commission debt payment that happened outside the app -
 * a bank transfer or mobile money payment an operator verified against a
 * WhatsApp receipt and is now entering into the finance tab by hand.
 */
class DriverSettlementService
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
        $account = DriverAccount::forDriver((int) $driver->id);

        return $this->ledger->post(
            type: JournalEntry::TYPE_ADJUSTMENT,
            idempotencyKey: "driver-settlement:{$reference}",
            description: "Manual settlement: {$note}",
            lines: [
                ['account' => 'BANK', 'debit' => $amount],
                ['account' => LedgerAccount::codeForDriver((int) $driver->id), 'credit' => $amount],
            ],
            reference: $account,
            createdBy: $createdBy->id,
        );
    }
}
