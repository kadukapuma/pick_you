<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\User;
use App\Services\Ledger\Money;
use DomainException;
use Illuminate\Support\Facades\DB;

class PickuCreditRefundService
{
    public function __construct(
        private readonly PassengerCreditService $credits,
    ) {}

    public function refund(
        Payment $payment,
        string $amount,
        User $requestedBy,
        string $reason,
        string $idempotencyKey,
    ): PaymentRefund {
        $amount = Money::of($amount);
        $reason = trim($reason);
        $idempotencyKey = trim($idempotencyKey);

        if (Money::cmp($amount, '0.00') <= 0) {
            throw new DomainException('Refund amount must be greater than zero.');
        }

        if ($reason === '') {
            throw new DomainException('A refund reason is required.');
        }

        if ($idempotencyKey === '') {
            throw new DomainException('A refund idempotency key is required.');
        }

        return DB::transaction(function () use (
            $payment,
            $amount,
            $requestedBy,
            $reason,
            $idempotencyKey,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $existing = PaymentRefund::query()
                ->where('idempotency_key', $idempotencyKey)
                ->first();

            if ($existing) {
                if (
                    (int) $existing->payment_id !== (int) $lockedPayment->id
                    || Money::cmp((string) $existing->amount, $amount) !== 0
                ) {
                    throw new DomainException('This refund idempotency key has already been used.');
                }

                return $existing;
            }

            if ($lockedPayment->payment_status !== PaymentStatus::COMPLETED->value) {
                throw new DomainException('Only completed payments can receive PickU credit refunds.');
            }

            $refunded = PaymentRefund::query()
                ->where('payment_id', $lockedPayment->id)
                ->where('status', PaymentRefund::STATUS_COMPLETED)
                ->sum('amount');

            $remaining = Money::sub((string) $lockedPayment->amount, (string) $refunded);

            if (Money::cmp($amount, $remaining) > 0) {
                throw new DomainException('Refund amount exceeds the payment balance available for refund.');
            }

            $refund = PaymentRefund::create([
                'payment_id' => $lockedPayment->id,
                'passenger_id' => $lockedPayment->passenger_id,
                'requested_by' => $requestedBy->id,
                'amount' => $amount,
                'destination' => PaymentRefund::DESTINATION_PICKU_CREDIT,
                'status' => PaymentRefund::STATUS_PENDING,
                'idempotency_key' => $idempotencyKey,
                'reason' => $reason,
            ]);

            $transaction = $this->credits->award(
                passenger: $lockedPayment->passenger,
                amount: $amount,
                createdBy: $requestedBy,
                reason: "Payment refund as PickU credit: {$reason}",
                reference: "payment-refund:{$refund->id}",
            );

            $refund->update([
                'wallet_transaction_id' => $transaction->id,
                'status' => PaymentRefund::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            return $refund->refresh();
        }, 3);
    }
}
