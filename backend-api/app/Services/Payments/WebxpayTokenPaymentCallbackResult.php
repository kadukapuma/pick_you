<?php

namespace App\Services\Payments;

final readonly class WebxpayTokenPaymentCallbackResult
{
    public function __construct(
        public bool $successful,
        public string $merchantOrderNumber,
        public ?string $providerReference
    ) {}
}
