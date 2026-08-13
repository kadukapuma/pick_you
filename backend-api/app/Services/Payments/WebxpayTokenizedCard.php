<?php

namespace App\Services\Payments;

use RuntimeException;

final readonly class WebxpayTokenizedCard
{
    public function __construct(
        private string $providerId,
        public string $brand,
        public string $last4,
        public int $expMonth,
        public int $expYear
    ) {
        if (trim($this->providerId) === '') {
            throw new RuntimeException(
                'WEBXPAY returned a card without an identifier.'
            );
        }

        if (preg_match('/^[0-9]{4}$/', $this->last4) !== 1) {
            throw new RuntimeException(
                'WEBXPAY returned invalid card display details.'
            );
        }

        if ($this->expMonth < 1 || $this->expMonth > 12) {
            throw new RuntimeException(
                'WEBXPAY returned an invalid card expiry.'
            );
        }
    }

    public function providerId(): string
    {
        return $this->providerId;
    }

    /**
     * Safe metadata for passenger-facing responses.
     *
     * @return array{brand: string, last4: string, exp_month: int, exp_year: int}
     */
    public function toPublicArray(): array
    {
        return [
            'brand' => $this->brand,
            'last4' => $this->last4,
            'exp_month' => $this->expMonth,
            'exp_year' => $this->expYear,
        ];
    }
}
