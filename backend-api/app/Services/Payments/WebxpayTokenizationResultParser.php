<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayTokenizationResultParser
{
    public function parse(string $encodedResult): WebxpayTokenizationResult
    {
        if ($encodedResult === '' || strlen($encodedResult) > 16384) {
            throw new RuntimeException(
                'WEBXPAY tokenization result is invalid.'
            );
        }

        $decoded = base64_decode(
            str_replace(' ', '+', $encodedResult),
            strict: true
        );

        if ($decoded === false) {
            throw new RuntimeException(
                'WEBXPAY tokenization result is invalid.'
            );
        }

        $payload = json_decode($decoded, true);

        if (! is_array($payload) || ! is_bool($payload['success'] ?? null)) {
            throw new RuntimeException(
                'WEBXPAY tokenization result is invalid.'
            );
        }

        $customer = $payload['customer'] ?? null;

        if (! is_array($customer)) {
            throw new RuntimeException(
                'WEBXPAY tokenization customer result is invalid.'
            );
        }

        $customerId = trim((string) ($customer['id'] ?? ''));
        $customerEmail = trim((string) ($customer['email'] ?? ''));

        if (
            $customerId === ''
            || filter_var($customerEmail, FILTER_VALIDATE_EMAIL) === false
        ) {
            throw new RuntimeException(
                'WEBXPAY tokenization customer result is invalid.'
            );
        }

        if ($payload['success'] === false) {
            return new WebxpayTokenizationResult(
                successful: false,
                customerId: $customerId,
                customerEmail: $customerEmail,
                providerCardId: null
            );
        }

        $card = $payload['card'] ?? null;
        $providerCardId = is_array($card)
            ? trim((string) ($card['id'] ?? ''))
            : '';

        if ($providerCardId === '') {
            throw new RuntimeException(
                'WEBXPAY tokenization card result is invalid.'
            );
        }

        return new WebxpayTokenizationResult(
            successful: true,
            customerId: $customerId,
            customerEmail: $customerEmail,
            providerCardId: $providerCardId
        );
    }
}
