<?php

namespace App\Services\Payments;

final readonly class WebxpaySaveCardResult
{
    private function __construct(
        public bool $completed,
        public ?string $threeDsUrl
    ) {}

    public static function completed(): self
    {
        return new self(
            completed: true,
            threeDsUrl: null
        );
    }

    public static function threeDsRequired(string $url): self
    {
        return new self(
            completed: false,
            threeDsUrl: $url
        );
    }

    public function requiresThreeDs(): bool
    {
        return $this->threeDsUrl !== null;
    }
}
