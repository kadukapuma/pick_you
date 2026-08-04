<?php

namespace App\Services\Payments;

use App\Models\JournalEntry;
use App\Models\Passenger;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\Money;
use App\Models\Payment;
use App\Models\PaymentAllocation;
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

    public function reserve(
        Payment $payment,
        string $amount,
        string $reference,
    ): PaymentAllocation {
        $amount = Money::of($amount);

        if (Money::cmp($amount, '0.00') <= 0) {
            throw new DomainException(
                'Reserved credit amount must be greater than zero.'
            );
        }

        if (Money::cmp($amount, (string) $payment->amount) > 0) {
            throw new DomainException(
                'Reserved credit cannot exceed the payment amount.'
            );
        }

        return DB::transaction(function () use (
            $payment,
            $amount,
            $reference,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($lockedPayment->passenger_id);

            $transactionReference = "reserve:{$reference}";

            $existingTransaction = WalletTransaction::query()
                ->where('reference', $transactionReference)
                ->first();

            if ($existingTransaction) {
                return PaymentAllocation::query()
                    ->where('payment_id', $lockedPayment->id)
                    ->where(
                        'type',
                        PaymentAllocation::TYPE_PICKU_CREDIT
                    )
                    ->firstOrFail();
            }

            $allocation = PaymentAllocation::query()
                ->where('payment_id', $lockedPayment->id)
                ->where(
                    'type',
                    PaymentAllocation::TYPE_PICKU_CREDIT
                )
                ->first();

            if (
                $allocation
                && $allocation->status
                === PaymentAllocation::STATUS_RESERVED
            ) {
                return $allocation;
            }

            if (
                $allocation
                && $allocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                throw new DomainException(
                    'This payment credit has already been consumed.'
                );
            }

            if (
                Money::cmp(
                    (string) $passenger->wallet_balance,
                    $amount
                ) < 0
            ) {
                throw new DomainException(
                    'Insufficient PickU credit balance.'
                );
            }

            $availableAfter = Money::sub(
                (string) $passenger->wallet_balance,
                $amount
            );

            $reservedAfter = Money::add(
                (string) $passenger->wallet_reserved_balance,
                $amount
            );

            $passenger->update([
                'wallet_balance' => $availableAfter,
                'wallet_reserved_balance' => $reservedAfter,
            ]);

            if ($allocation) {
                $allocation->update([
                    'amount' => $amount,
                    'status' => PaymentAllocation::STATUS_RESERVED,
                    'reserved_at' => now(),
                    'completed_at' => null,
                    'released_at' => null,
                ]);
            } else {
                $allocation = PaymentAllocation::create([
                    'payment_id' => $lockedPayment->id,
                    'type' => PaymentAllocation::TYPE_PICKU_CREDIT,
                    'amount' => $amount,
                    'status' => PaymentAllocation::STATUS_RESERVED,
                    'reference' => $reference,
                    'reserved_at' => now(),
                ]);
            }

            WalletTransaction::create([
                'user_id' => $passenger->user_id,
                'ride_id' => $lockedPayment->ride_id,
                'payment_id' => $lockedPayment->id,
                'transaction_type'
                => WalletTransaction::TYPE_CREDIT_RESERVATION,
                'amount' => $amount,
                'balance_after' => $availableAfter,
                'description' => sprintf(
                    'PickU credit reserved for ride %d.',
                    $lockedPayment->ride_id
                ),
                'reference' => $transactionReference,
                'status' => WalletTransaction::STATUS_RESERVED,
                'metadata' => [
                    'payment_allocation_id' => $allocation->id,
                    'reserved_balance_after' => $reservedAfter,
                ],
            ]);

            return $allocation->refresh();
        }, 3);
    }

    public function release(
        PaymentAllocation $allocation,
        string $reference,
    ): PaymentAllocation {
        return DB::transaction(function () use (
            $allocation,
            $reference,
        ) {
            $payment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($allocation->payment_id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($payment->passenger_id);

            $lockedAllocation = PaymentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            $transactionReference = "release:{$reference}";

            $existingTransaction = WalletTransaction::query()
                ->where('reference', $transactionReference)
                ->first();

            if ($existingTransaction) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_RELEASED
            ) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                throw new DomainException(
                    'Consumed PickU credit cannot be released.'
                );
            }

            if (
                $lockedAllocation->status
                !== PaymentAllocation::STATUS_RESERVED
            ) {
                throw new DomainException(
                    'Only reserved PickU credit can be released.'
                );
            }

            $amount = Money::of($lockedAllocation->amount);

            if (
                Money::cmp(
                    (string) $passenger->wallet_reserved_balance,
                    $amount
                ) < 0
            ) {
                throw new DomainException(
                    'Reserved passenger balance is inconsistent.'
                );
            }

            $availableAfter = Money::add(
                (string) $passenger->wallet_balance,
                $amount
            );

            $reservedAfter = Money::sub(
                (string) $passenger->wallet_reserved_balance,
                $amount
            );

            $passenger->update([
                'wallet_balance' => $availableAfter,
                'wallet_reserved_balance' => $reservedAfter,
            ]);

            $lockedAllocation->update([
                'status' => PaymentAllocation::STATUS_RELEASED,
                'released_at' => now(),
            ]);

            WalletTransaction::create([
                'user_id' => $passenger->user_id,
                'ride_id' => $payment->ride_id,
                'payment_id' => $payment->id,
                'transaction_type'
                => WalletTransaction::TYPE_CREDIT_RELEASED,
                'amount' => $amount,
                'balance_after' => $availableAfter,
                'description' => sprintf(
                    'PickU credit released for ride %d.',
                    $payment->ride_id
                ),
                'reference' => $transactionReference,
                'status' => WalletTransaction::STATUS_RELEASED,
                'metadata' => [
                    'payment_allocation_id'
                    => $lockedAllocation->id,
                    'reserved_balance_after' => $reservedAfter,
                ],
            ]);

            return $lockedAllocation->refresh();
        }, 3);
    }

    public function consume(
        PaymentAllocation $allocation,
        string $reference,
    ): PaymentAllocation {
        return DB::transaction(function () use (
            $allocation,
            $reference,
        ) {
            $payment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($allocation->payment_id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($payment->passenger_id);

            $lockedAllocation = PaymentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            $transactionReference = "consume:{$reference}";

            $existingTransaction = WalletTransaction::query()
                ->where('reference', $transactionReference)
                ->first();

            if ($existingTransaction) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                !== PaymentAllocation::STATUS_RESERVED
            ) {
                throw new DomainException(
                    'Only reserved PickU credit can be consumed.'
                );
            }

            $amount = Money::of($lockedAllocation->amount);

            if (
                Money::cmp(
                    (string) $passenger->wallet_reserved_balance,
                    $amount
                ) < 0
            ) {
                throw new DomainException(
                    'Reserved passenger balance is inconsistent.'
                );
            }

            $reservedAfter = Money::sub(
                (string) $passenger->wallet_reserved_balance,
                $amount
            );

            $passenger->update([
                'wallet_reserved_balance' => $reservedAfter,
            ]);

            $lockedAllocation->update([
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            WalletTransaction::create([
                'user_id' => $passenger->user_id,
                'ride_id' => $payment->ride_id,
                'payment_id' => $payment->id,
                'transaction_type'
                => WalletTransaction::TYPE_CREDIT_CONSUMED,
                'amount' => $amount,
                'balance_after' => $passenger->wallet_balance,
                'description' => sprintf(
                    'PickU credit used for ride %d.',
                    $payment->ride_id
                ),
                'reference' => $transactionReference,
                'status' => WalletTransaction::STATUS_COMPLETED,
                'metadata' => [
                    'payment_allocation_id'
                    => $lockedAllocation->id,
                    'reserved_balance_after' => $reservedAfter,
                ],
            ]);

            return $lockedAllocation->refresh();
        }, 3);
    }
}
