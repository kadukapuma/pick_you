<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentAttempt;
use App\Models\WebxpayTokenPaymentOperation;
use DomainException;
use Illuminate\Support\Facades\DB;

class WebxpayTokenPaymentCallbackProcessor
{
    public function __construct(
        private readonly WebxpayTokenPaymentResultParser $parser,
        private readonly WebxpayOutcomeProcessor $outcomeProcessor,
        private readonly PassengerCreditService $credits
    ) {}

    public function process(
        WebxpayTokenPaymentOperation $operation,
        string $callbackToken,
        string $encodedResult
    ): Payment {
        $operation = WebxpayTokenPaymentOperation::query()
            ->with('paymentAttempt.payment')
            ->findOrFail($operation->id);

        $this->verifyCallbackToken($operation, $callbackToken);

        if (in_array($operation->status, [
            WebxpayTokenPaymentOperation::STATUS_COMPLETED,
            WebxpayTokenPaymentOperation::STATUS_FAILED,
        ], true)) {
            return $operation->paymentAttempt->payment;
        }

        if ($operation->status !== WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED) {
            throw new DomainException(
                'WEBXPAY token payment callback is not expected.'
            );
        }

        if ($operation->isExpired()) {
            return $this->fail(
                $operation,
                'EXPIRED',
                'Saved-card authentication expired.'
            );
        }

        $result = $this->parser->parse($encodedResult);
        $attempt = $operation->paymentAttempt;

        if (! hash_equals(
            $attempt->merchant_order_id,
            $result->merchantOrderNumber
        )) {
            throw new DomainException(
                'WEBXPAY token payment result does not match the attempt.'
            );
        }

        if (! $result->successful) {
            return $this->fail(
                $operation,
                'THREE_DS_FAILED',
                'Card authentication was not completed.'
            );
        }

        $payment = $this->outcomeProcessor->process($attempt, [
            'merchant_order_id' => $attempt->merchant_order_id,
            'provider_reference' => (string) $result->providerReference,
            'transaction_time' => now()->format('Y-m-d H:i:s'),
            'status_code' => '00',
            'comment' => '00 - Approved',
            'gateway' => (string) config('payments.webxpay.response_gateway_id'),
            'transaction_amount' => (string) $attempt->amount,
            'requested_amount' => (string) $attempt->amount,
        ]);

        DB::transaction(function () use ($operation) {
            $locked = WebxpayTokenPaymentOperation::query()
                ->lockForUpdate()
                ->findOrFail($operation->id);

            if ($locked->status === WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED) {
                $locked->markCompleted();
            }
        }, 3);

        return $payment;
    }

    private function fail(
        WebxpayTokenPaymentOperation $operation,
        string $code,
        string $reason
    ): Payment {
        return DB::transaction(function () use ($operation, $code, $reason) {
            $lockedOperation = WebxpayTokenPaymentOperation::query()
                ->lockForUpdate()
                ->findOrFail($operation->id);
            $attempt = PaymentAttempt::query()
                ->lockForUpdate()
                ->findOrFail($lockedOperation->payment_attempt_id);
            $payment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($attempt->payment_id);

            if ($lockedOperation->status === WebxpayTokenPaymentOperation::STATUS_FAILED) {
                return $payment;
            }

            if ($lockedOperation->status === WebxpayTokenPaymentOperation::STATUS_COMPLETED
                || $payment->payment_status === PaymentStatus::COMPLETED->value
            ) {
                throw new DomainException(
                    'Completed WEBXPAY payment cannot be failed.'
                );
            }

            $cardAllocation = PaymentAllocation::query()
                ->where('payment_id', $payment->id)
                ->where('type', PaymentAllocation::TYPE_CARD)
                ->lockForUpdate()
                ->firstOrFail();
            $creditAllocation = PaymentAllocation::query()
                ->where('payment_id', $payment->id)
                ->where('type', PaymentAllocation::TYPE_PICKU_CREDIT)
                ->lockForUpdate()
                ->first();

            $attempt->update([
                'status' => PaymentAttemptStatus::DECLINED->value,
                'provider_status' => $code,
                'failure_code' => $code,
                'failure_reason' => $reason,
                'completed_at' => now(),
            ]);
            $cardAllocation->update([
                'status' => PaymentAllocation::STATUS_RELEASED,
                'completed_at' => null,
                'released_at' => now(),
            ]);

            if ($creditAllocation
                && $creditAllocation->status === PaymentAllocation::STATUS_RESERVED
            ) {
                $this->credits->release(
                    $creditAllocation,
                    'webxpay:token-operation:'.$lockedOperation->id.':'.$code
                );
            }

            $payment->update([
                'payment_status' => PaymentStatus::DECLINED->value,
                'paid_at' => null,
                'gateway' => 'webxpay',
                'gateway_reference' => null,
                'failure_reason' => $reason,
            ]);
            $payment->events()->firstOrCreate([
                'payment_attempt_id' => $attempt->id,
                'event_type' => 'PAYMENT_DECLINED',
            ], [
                'source' => 'gateway',
                'metadata' => [
                    'status_code' => $code,
                    'reason' => $reason,
                    'payment_source' => 'SAVED_CARD',
                ],
            ]);
            $lockedOperation->markFailed($code, $reason);

            return $payment->refresh();
        }, 3);
    }

    private function verifyCallbackToken(
        WebxpayTokenPaymentOperation $operation,
        string $callbackToken
    ): void {
        $expectedHash = (string) $operation->getRawOriginal(
            'callback_token_hash'
        );

        if (strlen($callbackToken) !== 64
            || $expectedHash === ''
            || ! hash_equals($expectedHash, hash('sha256', $callbackToken))
        ) {
            throw new DomainException(
                'WEBXPAY token payment callback token is invalid.'
            );
        }
    }
}
