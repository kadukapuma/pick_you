<?php

namespace App\Services\Payments;

final readonly class WebxpayTokenizationResult
{
    public function __construct(
        public bool $successful,
        public ?string $customerId,
        public ?string $customerEmail,
        public ?string $providerCardId,
        public ?string $failureCode = null,
        public ?string $failureReason = null,
    ) {}
}
