<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayAppResultUrl
{
    private readonly string $baseUrl;

    public function __construct(
        string $baseUrl
    ) {
        $baseUrl = trim($baseUrl);

        if (
            $baseUrl === ''
            || parse_url($baseUrl, PHP_URL_SCHEME) !== 'picku'
        ) {
            throw new RuntimeException(
                'WEBXPAY app result URL is invalid.'
            );
        }

        $this->baseUrl = $baseUrl;
    }

    public function forPayment(
        int $rideId,
        int $paymentId,
        string $status
    ): string {
        $query = http_build_query(
            [
                'ride_id' => $rideId,
                'payment_id' => $paymentId,
                'status' => strtoupper($status),
            ],
            '',
            '&',
            PHP_QUERY_RFC3986
        );

        $separator = str_contains(
            $this->baseUrl,
            '?'
        ) ? '&' : '?';

        return $this->baseUrl
          .$separator
          .$query;
    }
}
