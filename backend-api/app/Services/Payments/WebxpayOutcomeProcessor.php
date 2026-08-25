<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentAttempt;
use App\Services\Ledger\Money;
use App\Services\Ledger\RideSettlementService;
use DomainException;
use Illuminate\Support\Facades\DB;

class WebxpayOutcomeProcessor
{
    public function __construct(
        private readonly WebxpayStatusMapper $statusMapper,
        private readonly PassengerCreditService $credits,
        private readonly LoyaltyPointsService $loyaltyPoints,
        private readonly RideSettlementService $settlement
    ) {}

    /**
     * @param  array<string, string>  $parsed
     */
    public function process(
        PaymentAttempt $attempt,
        array $parsed
    ): Payment {
        return DB::transaction(function () use (
            $attempt,
            $parsed
        ) {
            $lockedAttempt = PaymentAttempt::query()
                ->lockForUpdate()
                ->findOrFail($attempt->id);

            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail(
                    $lockedAttempt->payment_id
                );

            if (
                $lockedAttempt->gateway !== 'webxpay'
                || ! hash_equals(
                    $lockedAttempt->merchant_order_id,
                    $parsed['merchant_order_id']
                )
            ) {
                throw new DomainException(
                    'WEBXPAY response does not match the payment attempt.'
                );
            }

            $hasTransactionAmount = array_key_exists(
                'transaction_amount',
                $parsed
            );

            $hasRequestedAmount = array_key_exists(
                'requested_amount',
                $parsed
            );

            if (
                $hasTransactionAmount
                || $hasRequestedAmount
            ) {
                if (
                    ! $hasTransactionAmount
                    || ! $hasRequestedAmount
                    || Money::of($parsed['transaction_amount'])
                    !== Money::of($lockedAttempt->amount)
                    || Money::of($parsed['requested_amount'])
                    !== Money::of($lockedAttempt->amount)
                ) {
                    throw new DomainException(
                        'WEBXPAY response amount does not match the payment attempt.'
                    );
                }
            }

            $mappedStatus = $this->statusMapper->map(
                $parsed['status_code']
            );

            if (
                $lockedAttempt->status === $mappedStatus->value
                && $lockedPayment->payment_status === $mappedStatus->value
                && $lockedAttempt->gateway_reference
                === $parsed['provider_reference']
                && $lockedAttempt->provider_status
                === $parsed['status_code']
            ) {
                return $lockedPayment;
            }

            if (
                $lockedPayment->payment_status
                === PaymentStatus::COMPLETED->value
            ) {
                throw new DomainException(
                    'Payment has already been completed.'
                );
            }

            $providerReferenceAlreadyUsed = PaymentAttempt::query()
                ->where('gateway', 'webxpay')
                ->where(
                    'gateway_reference',
                    $parsed['provider_reference']
                )
                ->whereKeyNot($lockedAttempt->id)
                ->exists();

            if ($providerReferenceAlreadyUsed) {
                throw new DomainException(
                    'WEBXPAY provider reference has already been used.'
                );
            }

            $cardAllocation = PaymentAllocation::query()
                ->where(
                    'payment_id',
                    $lockedPayment->id
                )
                ->where(
                    'type',
                    PaymentAllocation::TYPE_CARD
                )
                ->lockForUpdate()
                ->first();

            if (! $cardAllocation) {
                throw new DomainException(
                    'WEBXPAY card allocation was not found.'
                );
            }

            if (
                Money::of($cardAllocation->amount)
                !== Money::of($lockedAttempt->amount)
            ) {
                throw new DomainException(
                    'WEBXPAY attempt amount does not match its card allocation.'
                );
            }

            $creditAllocation = PaymentAllocation::query()
                ->where(
                    'payment_id',
                    $lockedPayment->id
                )
                ->where(
                    'type',
                    PaymentAllocation::TYPE_PICKU_CREDIT
                )
                ->lockForUpdate()
                ->first();

            $loyaltyAllocation = PaymentAllocation::query()
                ->where(
                    'payment_id',
                    $lockedPayment->id
                )
                ->where(
                    'type',
                    PaymentAllocation::TYPE_LOYALTY_POINTS
                )
                ->lockForUpdate()
                ->first();

            if ($mappedStatus === PaymentAttemptStatus::DECLINED) {
                $lockedAttempt->update([
                    'status' => PaymentAttemptStatus::DECLINED->value,
                    'gateway_reference' => $parsed['provider_reference'],
                    'provider_status' => $parsed['status_code'],
                    'failure_code' => $parsed['status_code'],
                    'failure_reason' => $parsed['comment'],
                    'completed_at' => now(),
                ]);

                $cardAllocation->update([
                    'status' => PaymentAllocation::STATUS_RELEASED,
                    'completed_at' => null,
                    'released_at' => now(),
                ]);

                if ($creditAllocation) {
                    $this->credits->release(
                        allocation: $creditAllocation,
                        reference: 'webxpay:'.$parsed['provider_reference']
                    );
                }

                if ($loyaltyAllocation) {
                    $this->loyaltyPoints->release(
                        allocation: $loyaltyAllocation,
                        reference: 'webxpay:'.$parsed['provider_reference']
                    );
                }

                $lockedPayment->update([
                    'payment_status' => PaymentStatus::DECLINED->value,
                    'paid_at' => null,
                    'gateway' => 'webxpay',
                    'gateway_reference' => null,
                    'failure_reason' => $parsed['comment'],
                ]);

                $lockedPayment->events()->create([
                    'payment_attempt_id' => $lockedAttempt->id,
                    'event_type' => 'PAYMENT_DECLINED',
                    'source' => 'gateway',
                    'provider_reference' => $parsed['provider_reference'],
                    'metadata' => [
                        'status_code' => $parsed['status_code'],
                        'transaction_time' => $parsed['transaction_time'],
                        'gateway' => $parsed['gateway'],
                        'reason' => $parsed['comment'],
                    ],
                ]);

                return $lockedPayment->refresh();
            }

            if ($mappedStatus === PaymentAttemptStatus::UNKNOWN) {
                $lockedAttempt->update([
                    'status' => PaymentAttemptStatus::UNKNOWN->value,
                    'gateway_reference' => $parsed['provider_reference'],
                    'provider_status' => $parsed['status_code'],
                    'failure_code' => $parsed['status_code'],
                    'failure_reason' => $parsed['comment'],
                    'completed_at' => now(),
                ]);

                $lockedPayment->update([
                    'payment_status' => PaymentStatus::UNKNOWN->value,
                    'paid_at' => null,
                    'gateway' => 'webxpay',
                    'gateway_reference' => null,
                    'failure_reason' => $parsed['comment'],
                ]);

                $lockedPayment->events()->create([
                    'payment_attempt_id' => $lockedAttempt->id,
                    'event_type' => 'PAYMENT_UNKNOWN',
                    'source' => 'gateway',
                    'provider_reference' => $parsed['provider_reference'],
                    'metadata' => [
                        'status_code' => $parsed['status_code'],
                        'transaction_time' => $parsed['transaction_time'],
                        'gateway' => $parsed['gateway'],
                        'reason' => $parsed['comment'],
                    ],
                ]);

                return $lockedPayment->refresh();
            }

            $lockedAttempt->update([
                'status' => PaymentAttemptStatus::COMPLETED->value,
                'gateway_reference' => $parsed['provider_reference'],
                'provider_status' => $parsed['status_code'],
                'failure_code' => null,
                'failure_reason' => null,
                'completed_at' => now(),
            ]);

            $cardAllocation->update([
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'completed_at' => now(),
                'released_at' => null,
            ]);

            if ($creditAllocation) {
                $this->credits->consume(
                    allocation: $creditAllocation,
                    reference: 'webxpay:'
                        .$parsed['provider_reference']
                );
            }

            if ($loyaltyAllocation) {
                $this->loyaltyPoints->consume(
                    allocation: $loyaltyAllocation,
                    reference: 'webxpay:'
                        .$parsed['provider_reference']
                );
            }

            $lockedPayment->update([
                'payment_status' => PaymentStatus::COMPLETED->value,
                'paid_at' => now(),
                'gateway' => 'webxpay',
                'gateway_reference' => $parsed['provider_reference'],
                'failure_reason' => null,
            ]);

            $lockedPayment->events()->create([
                'payment_attempt_id' => $lockedAttempt->id,
                'event_type' => 'PAYMENT_COMPLETED',
                'source' => 'gateway',
                'provider_reference' => $parsed['provider_reference'],
                'metadata' => [
                    'status_code' => $parsed['status_code'],
                    'transaction_time' => $parsed['transaction_time'],
                    'gateway' => $parsed['gateway'],
                ],
            ]);

            $this->settlement->settle(
                $lockedPayment->refresh()
            );

            return $lockedPayment->refresh();
        }, 3);
    }
}
