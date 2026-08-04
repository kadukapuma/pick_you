<?php

namespace App\Services\Payments;

use App\Models\JournalEntry;
use App\Models\Passenger;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\Money;
use Carbon\CarbonInterface;
use DomainException;
use Illuminate\Support\Facades\DB;

class PassengerCreditService
{
    public function __construct(
        private readonly LedgerService $ledger,
    ) {}

    public function award(
        Passenger $passenger,
        string $amount,
        User $createdBy,
        string $reason,
        string $reference,
        ?CarbonInterface $expiresAt = null,
    ): WalletTransaction {
        $amount = Money::of($amount);
        $reason = trim($reason);

        if (Money::cmp($amount, '0.00') <= 0) {
            throw new DomainException(
                'Passenger credit amount must be greater than zero.'
            );
        }

        if ($reason === '') {
            throw new DomainException(
                'A reason is required when awarding passenger credit.'
            );
        }

        return DB::transaction(function () use (
            $passenger,
            $amount,
            $createdBy,
            $reason,
            $reference,
            $expiresAt,
        ) {
            $lockedPassenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($passenger->id);

            $existing = WalletTransaction::query()
                ->where('reference', $reference)
                ->first();

            if ($existing) {
                if (
                    (int) $existing->user_id
                    !== (int) $lockedPassenger->user_id
                    || $existing->transaction_type
                    !== WalletTransaction::TYPE_CREDIT_AWARD
                ) {
                    throw new DomainException(
                        'This credit reference has already been used.'
                    );
                }

                return $existing;
            }

            $balanceAfter = Money::add(
                (string) $lockedPassenger->wallet_balance,
                $amount
            );

            $entry = $this->ledger->post(
                type: JournalEntry::TYPE_PASSENGER_CREDIT,
                idempotencyKey: "passenger-credit:{$reference}",
                description: "Passenger credit awarded: {$reason}",
                lines: [
                    [
                        'account' => 'PASSENGER_CREDIT_EXPENSE',
                        'debit' => $amount,
                    ],
                    [
                        'account' => 'PASSENGER_WALLET_LIABILITY',
                        'credit' => $amount,
                    ],
                ],
                reference: $lockedPassenger,
                createdBy: $createdBy->id,
            );

            $lockedPassenger->update([
                'wallet_balance' => $balanceAfter,
            ]);

            return WalletTransaction::create([
                'user_id' => $lockedPassenger->user_id,
                'transaction_type'
                => WalletTransaction::TYPE_CREDIT_AWARD,
                'amount' => $amount,
                'balance_after' => $balanceAfter,
                'description' => $reason,
                'created_by' => $createdBy->id,
                'reference' => $reference,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => [
                    'journal_entry_id' => $entry->id,
                ],
                'expires_at' => $expiresAt,
            ]);
        }, 3);
    }
}
