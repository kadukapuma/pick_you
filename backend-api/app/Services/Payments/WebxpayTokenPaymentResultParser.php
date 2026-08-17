<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayTokenPaymentResultParser
{
    public function parse(string $encodedResult): WebxpayTokenPaymentCallbackResult
    {
        if ($encodedResult === '' || strlen($encodedResult) > 16384) {
            throw new RuntimeException(
                'WEBXPAY token payment result is invalid.'
            );
        }

        $decoded = base64_decode(
            str_replace(' ', '+', $encodedResult),
            strict: true
        );

        if ($decoded === false) {
            throw new RuntimeException(
                'WEBXPAY token payment result is invalid.'
            );
        }

        $payload = json_decode($decoded, true);

        if (! is_array($payload)) {
            throw new RuntimeException(
                'WEBXPAY token payment result is invalid.'
            );
        }

        $successful = $payload['Success'] ?? $payload['success'] ?? null;
        $orderNumber = $payload['MerchantProvidedOrderNumber']
            ?? $payload['merchantProvidedOrderNumber']
            ?? null;
        $providerReference = $payload['Receipt']
            ?? $payload['webxOrderReference']
            ?? $payload['receipt']
            ?? null;

        if (! is_bool($successful)
            || ! is_string($orderNumber)
            || preg_match('/^[A-Za-z0-9_-]+$/', $orderNumber) !== 1
        ) {
            throw new RuntimeException(
                'WEBXPAY token payment result is invalid.'
            );
        }

        if ($successful) {
            if (! is_string($providerReference)
                || preg_match('/^[A-Za-z0-9_-]+$/', $providerReference) !== 1
            ) {
                throw new RuntimeException(
                    'WEBXPAY token payment reference is invalid.'
                );
            }
        } elseif (! is_null($providerReference)
            && (! is_string($providerReference)
                || preg_match('/^[A-Za-z0-9_-]+$/', $providerReference) !== 1)
        ) {
            throw new RuntimeException(
                'WEBXPAY token payment reference is invalid.'
            );
        }

        return new WebxpayTokenPaymentCallbackResult(
            successful: $successful,
            merchantOrderNumber: $orderNumber,
            providerReference: $providerReference
        );
    }
}
