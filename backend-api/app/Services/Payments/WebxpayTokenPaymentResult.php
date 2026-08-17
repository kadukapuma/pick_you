<?php

namespace App\Services\Payments;

final readonly class WebxpayTokenPaymentResult
{
    private function __construct(
        public bool $completed,
        public ?string $gatewayReference,
        public ?string $threeDsUrl,
    ) {}

    public static function completed(string $gatewayReference): self
    {
        return new self(
            completed: true,
            gatewayReference: $gatewayReference,
            threeDsUrl: null,
        );
    }

    public static function threeDsRequired(string $url): self
    {
        return new self(
            completed: false,
            gatewayReference: null,
            threeDsUrl: $url,
        );
    }

    public function requiresThreeDs(): bool
    {
        return $this->threeDsUrl !== null;
    }
}
