<?php

namespace App\Services\Payments;

use RuntimeException;

class WebxpayResponseVerifier
{
    public function __construct(
        private readonly string $publicKeyPath
    ) {}

    /**
     * @return array{
     *     payment: string,
     *     custom_fields: string
     * }
     */
    public function verify(
        string $payment,
        string $signature,
        ?string $customFields = null
    ): array {
        $decodedPayment = base64_decode(
            $payment,
            true
        );

        if (
            $decodedPayment === false
            || $decodedPayment === ''
        ) {
            throw new RuntimeException(
                'WEBXPAY payment response is invalid.'
            );
        }

        $decodedSignature = base64_decode(
            $signature,
            true
        );

        if (
            $decodedSignature === false
            || $decodedSignature === ''
        ) {
            throw new RuntimeException(
                'WEBXPAY response signature is invalid.'
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

        $verifiedPayment = null;

        $decryptedSuccessfully = openssl_public_decrypt(
            $decodedSignature,
            $verifiedPayment,
            $publicKey,
            OPENSSL_PKCS1_PADDING
        );

        if (
            ! $decryptedSuccessfully
            || ! is_string($verifiedPayment)
            || ! hash_equals(
                $verifiedPayment,
                $decodedPayment
            )
        ) {
            throw new RuntimeException(
                'WEBXPAY response signature verification failed.'
            );
        }

        $decodedCustomFields = '';

        if (
            $customFields !== null
            && $customFields !== ''
        ) {
            $decodedCustomFields = base64_decode(
                $customFields,
                true
            );

            if ($decodedCustomFields === false) {
                throw new RuntimeException(
                    'WEBXPAY custom fields response is invalid.'
                );
            }
        }

        return [
            'payment' => $decodedPayment,
            'custom_fields' => $decodedCustomFields,
        ];
    }
}
