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

        if (! is_array($payload)) {
            throw new RuntimeException(
                'WEBXPAY tokenization result is invalid.'
            );
        }

        /**
         * WEBXPAY sometimes returns an error envelope instead of the normal
         * success/customer/card shape - e.g. {"error":true,"type":
         * "duplicate_card","explanation":"..."} when the card is already
         * tokenized for this customer. That's a real, expected outcome, not
         * a malformed response - surface it as a failure with WEBXPAY's own
         * reason instead of throwing "invalid".
         */
        if (($payload['error'] ?? null) === true) {
            $code = is_string($payload['type'] ?? null) && trim($payload['type']) !== ''
                ? $payload['type']
                : 'PROVIDER_ERROR';

            $reason = is_string($payload['explanation'] ?? null) && trim($payload['explanation']) !== ''
                ? trim($payload['explanation'])
                : 'WEBXPAY rejected the card.';

            return new WebxpayTokenizationResult(
                successful: false,
                customerId: null,
                customerEmail: null,
                providerCardId: null,
                failureCode: $code,
                failureReason: $reason
            );
        }

        if (! is_bool($payload['success'] ?? null)) {
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
