<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;

final class GatewayResult
{
    private function __construct(
        public readonly bool $successful,
        public readonly string $gateway,
        public readonly PaymentAttemptStatus $status,
        public readonly ?string $reference = null,
        public readonly ?string $failureReason = null,
        public readonly bool $retryable = false,
    ) {}

    public static function success(string $gateway, string $reference): self
    {
        return new self(
            successful: true,
            gateway: $gateway,
            status: PaymentAttemptStatus::COMPLETED,
            reference: $reference,
        );
    }

    /** The provider definitely rejected the payment. */
    public static function declined(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            status: PaymentAttemptStatus::DECLINED,
            failureReason: $reason,
            retryable: true,
        );
    }

    /** A technical failure known not to have charged the customer. */
    public static function error(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            status: PaymentAttemptStatus::FAILED,
            failureReason: $reason,
            retryable: true,
        );
    }

    /** The provider is still processing the payment. */
    public static function pending(
        string $gateway,
        ?string $reference = null
    ): self {
        return new self(
            successful: false,
            gateway: $gateway,
            status: PaymentAttemptStatus::PENDING,
            reference: $reference,
            retryable: false,
        );
    }

    /**
     * Communication stopped before the outcome was confirmed.
     * The customer may have been charged, so immediate retry is unsafe.
     */
    public static function unknown(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            status: PaymentAttemptStatus::UNKNOWN,
            failureReason: $reason,
            retryable: false,
        );
    }

    /** The customer or provider cancelled the payment flow. */
    public static function cancelled(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            status: PaymentAttemptStatus::CANCELLED,
            failureReason: $reason,
            retryable: true,
        );
    }
}
