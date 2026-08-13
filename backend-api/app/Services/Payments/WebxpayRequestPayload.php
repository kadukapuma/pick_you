<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayRequestPayload
{
    public function __construct(
        private readonly string $publicKeyPath
    ) {}

    public function encrypt(
        string $merchantOrderId,
        string $amount
    ): string {
        if (
            $merchantOrderId === ''
            || preg_match(
                '/^[A-Za-z0-9_-]+$/',
                $merchantOrderId
            ) !== 1
        ) {
            throw new RuntimeException(
                'WEBXPAY merchant order ID is invalid.'
            );
        }

        if (
            preg_match(
                '/^(?:0|[1-9][0-9]*)\.[0-9]{2}$/',
                $amount
            ) !== 1
        ) {
            throw new RuntimeException(
                'WEBXPAY payment amount is invalid.'
            );
        }

        $wholeLkr = strstr(
            $amount,
            '.',
            true
        );

        if ($wholeLkr === '0') {
            throw new RuntimeException(
                'WEBXPAY payment amount must be at least 1.00 LKR.'
            );
        }

        if (! is_file($this->publicKeyPath)) {
            throw new RuntimeException(
                'WEBXPAY public key file was not found.'
            );
        }

        $publicKeyContents = file_get_contents(
            $this->publicKeyPath
        );

        if ($publicKeyContents === false) {
            throw new RuntimeException(
                'WEBXPAY public key file could not be read.'
            );
        }

        $publicKey = openssl_pkey_get_public(
            $publicKeyContents
        );

        if ($publicKey === false) {
            throw new RuntimeException(
                'WEBXPAY public key is invalid.'
            );
        }

        $plaintext = $merchantOrderId.'|'.$amount;
        $encrypted = null;

        $encryptedSuccessfully = openssl_public_encrypt(
            $plaintext,
            $encrypted,
            $publicKey,
            OPENSSL_PKCS1_PADDING
        );

        if (! $encryptedSuccessfully) {
            throw new RuntimeException(
                'WEBXPAY payment payload encryption failed.'
            );
        }

        return base64_encode($encrypted);
    }
}
