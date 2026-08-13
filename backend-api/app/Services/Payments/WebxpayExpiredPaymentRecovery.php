<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use Illuminate\Support\Facades\DB;

class WebxpayExpiredPaymentRecovery
{
    public function recoverExpired(int $limit = 100): int
    {
        $limit = max(1, min($limit, 1000));

        $attemptIds = PaymentAttempt::query()
            ->where('gateway', 'webxpay')
            ->where('status', PaymentAttemptStatus::PROCESSING->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->whereHas('payment', fn ($query) => $query
                ->whereIn('payment_status', [
                    PaymentStatus::PENDING->value,
                    PaymentStatus::PROCESSING->value,
                ]))
            ->orderBy('id')
            ->limit($limit)
            ->pluck('id');

        $recovered = 0;

        foreach ($attemptIds as $attemptId) {
            $changed = DB::transaction(function () use ($attemptId): bool {
                $attempt = PaymentAttempt::query()
                    ->lockForUpdate()
                    ->find($attemptId);

                if (! $attempt
                    || $attempt->gateway !== 'webxpay'
                    || $attempt->status !== PaymentAttemptStatus::PROCESSING->value
                    || ! $attempt->expires_at
                    || $attempt->expires_at->isFuture()
                ) {
                    return false;
                }

                $payment = Payment::query()
                    ->lockForUpdate()
                    ->findOrFail($attempt->payment_id);

                if (! in_array($payment->payment_status, [
                    PaymentStatus::PENDING->value,
                    PaymentStatus::PROCESSING->value,
                ], true)) {
                    return false;
                }

                $reason = 'WEBXPAY attempt expired before a verified final result was received.';

                $attempt->update([
                    'status' => PaymentAttemptStatus::UNKNOWN->value,
                    'failure_code' => 'EXPIRED_UNRECONCILED',
                    'failure_reason' => $reason,
                    'completed_at' => now(),
                ]);

                $payment->update([
                    'payment_status' => PaymentStatus::UNKNOWN->value,
                    'paid_at' => null,
                    'gateway' => 'webxpay',
                    'gateway_reference' => null,
                    'failure_reason' => $reason,
                ]);

                $payment->events()->firstOrCreate([
                    'payment_attempt_id' => $attempt->id,
                    'event_type' => 'PAYMENT_UNKNOWN',
                ], [
                    'source' => 'recovery',
                    'metadata' => [
                        'status_code' => 'EXPIRED_UNRECONCILED',
                        'reason' => $reason,
                    ],
                ]);

                return true;
            }, 3);

            if ($changed) {
                $recovered++;
            }
        }

        return $recovered;
    }
}
