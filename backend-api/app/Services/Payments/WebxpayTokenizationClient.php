<?php

namespace App\Services\Payments;

use Illuminate\Http\Client\Factory as HttpFactory;
use Illuminate\Support\Facades\Cache;
use RuntimeException;

class WebxpayTokenizationClient
{
    public function __construct(
        private readonly HttpFactory $http,
        private readonly string $baseUrl,
        private readonly string $username,
        private readonly string $password,
        private readonly int $tokenCacheSeconds = 3300
    ) {
        if (
            filter_var($this->baseUrl, FILTER_VALIDATE_URL) === false
            || parse_url($this->baseUrl, PHP_URL_SCHEME) !== 'https'
        ) {
            throw new RuntimeException(
                'WEBXPAY tokenization URL must be a valid HTTPS URL.'
            );
        }

        if (trim($this->username) === '' || trim($this->password) === '') {
            throw new RuntimeException(
                'WEBXPAY tokenization credentials are not configured.'
            );
        }

        if ($this->tokenCacheSeconds < 1) {
            throw new RuntimeException(
                'WEBXPAY token cache duration must be positive.'
            );
        }
    }

    public function accessToken(): string
    {
        return Cache::remember(
            $this->cacheKey(),
            $this->tokenCacheSeconds,
            fn () => $this->authenticate()
        );
    }

    /**
     * @return list<WebxpayTokenizedCard>
     */
    public function cards(string $customerId, string $customerEmail): array
    {
        if (trim($customerId) === '') {
            throw new RuntimeException(
                'WEBXPAY tokenization customer ID is required.'
            );
        }

        if (filter_var($customerEmail, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException(
                'WEBXPAY tokenization customer email is invalid.'
            );
        }

        $response = $this->http
            ->acceptJson()
            ->asJson()
            ->withToken($this->accessToken())
            ->timeout(15)
            ->post(
                rtrim($this->baseUrl, '/').'/api/cards/get',
                [
                    'customer' => [
                        'id' => $customerId,
                        'email' => $customerEmail,
                    ],
                ]
            );

        if (! $response->successful()) {
            throw new RuntimeException(
                'WEBXPAY saved cards request failed.'
            );
        }

        $cards = $response->json();

        if (! is_array($cards) || ! array_is_list($cards)) {
            throw new RuntimeException(
                'WEBXPAY saved cards response is invalid.'
            );
        }

        return array_map(
            fn ($card) => $this->mapCard($card),
            $cards
        );
    }

    private function authenticate(): string
    {
        $response = $this->http
            ->acceptJson()
            ->asJson()
            ->timeout(15)
            ->post(
                rtrim($this->baseUrl, '/').'/api/auth',
                [
                    'username' => $this->username,
                    'password' => $this->password,
                ]
            );

        if (! $response->successful()) {
            throw new RuntimeException(
                'WEBXPAY tokenization authentication failed.'
            );
        }

        $payload = $response->json();
        $token = match (true) {
            is_string($payload) => $payload,
            is_array($payload) => $payload['token']
                ?? $payload['access_token']
                ?? null,
            default => null,
        };

        if (! is_string($token) || ! $this->looksLikeJwt($token)) {
            throw new RuntimeException(
                'WEBXPAY tokenization authentication returned an invalid token.'
            );
        }

        return trim($token);
    }

    private function cacheKey(): string
    {
        return 'payments:webxpay:tokenization:access-token:'
            .hash('sha256', rtrim($this->baseUrl, '/').'|'.$this->username);
    }

    private function mapCard(mixed $card): WebxpayTokenizedCard
    {
        if (! is_array($card)) {
            throw new RuntimeException(
                'WEBXPAY saved cards response is invalid.'
            );
        }

        $expiry = $card['cardExpiry'] ?? null;

        if (! is_string($expiry) || preg_match('/^[0-9]{4}$/', $expiry) !== 1) {
            throw new RuntimeException(
                'WEBXPAY returned an invalid card expiry.'
            );
        }

        return new WebxpayTokenizedCard(
            providerId: (string) ($card['cardId'] ?? ''),
            brand: strtoupper(trim((string) ($card['cardScheme'] ?? ''))),
            last4: (string) ($card['cardLast'] ?? ''),
            expMonth: (int) substr($expiry, 0, 2),
            expYear: 2000 + (int) substr($expiry, 2, 2)
        );
    }

    private function looksLikeJwt(string $token): bool
    {
        return preg_match(
            '/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/',
            trim($token)
        ) === 1;
    }
}
