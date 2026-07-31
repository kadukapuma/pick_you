<?php

namespace App\Services\Payments;

final class GatewayResult
{
    private function __construct(
        public readonly bool $successful,
        public readonly string $gateway,
        public readonly ?string $reference = null,
        public readonly ?string $failureReason = null,
        public readonly bool $retryable = false,
    ) {}

    public static function success(string $gateway, string $reference): self
    {
        return new self(successful: true, gateway: $gateway, reference: $reference);
    }

    /** A hard decline - the card will not work, ask for another payment method. */
    public static function declined(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            failureReason: $reason,
            retryable: false,
        );
    }

    /** A transient failure - the same card may succeed on retry. */
    public static function error(string $gateway, string $reason): self
    {
        return new self(
            successful: false,
            gateway: $gateway,
            failureReason: $reason,
            retryable: true,
        );
    }
}
