<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayResponseVerifier;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayResponseVerifierTest extends TestCase
{
    private string $privateKey = '';

    private string $publicKeyPath;

    protected function setUp(): void
    {
        parent::setUp();

        $keyPair = openssl_pkey_new([
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ]);

        if ($keyPair === false) {
            throw new RuntimeException(
                'Unable to create the test RSA key pair.'
            );
        }

        if (
            ! openssl_pkey_export(
                $keyPair,
                $this->privateKey
            )
        ) {
            throw new RuntimeException(
                'Unable to export the test private key.'
            );
        }

        $details = openssl_pkey_get_details(
            $keyPair
        );

        if ($details === false) {
            throw new RuntimeException(
                'Unable to read the test public key.'
            );
        }

        $path = tempnam(
            sys_get_temp_dir(),
            'webxpay-response-test-'
        );

        if ($path === false) {
            throw new RuntimeException(
                'Unable to create the test public-key file.'
            );
        }

        $this->publicKeyPath = $path;

        file_put_contents(
            $this->publicKeyPath,
            $details['key']
        );
    }

    protected function tearDown(): void
    {
        if (
            isset($this->publicKeyPath)
            && is_file($this->publicKeyPath)
        ) {
            unlink($this->publicKeyPath);
        }

        parent::tearDown();
    }

    public function test_it_verifies_an_authentic_webxpay_response(): void
    {
        $rawPayment = implode('|', [
            'PKU-R-123-P-1-A01',
            'WXP-REFERENCE-1',
            '2026-08-05 12:30:00',
            '46',
            '00',
            'Approved',
        ]);

        $signature = null;

        $signedSuccessfully = openssl_private_encrypt(
            $rawPayment,
            $signature,
            $this->privateKey,
            OPENSSL_PKCS1_PADDING
        );

        $this->assertTrue(
            $signedSuccessfully
        );

        $verifier = new WebxpayResponseVerifier(
            $this->publicKeyPath
        );

        $verified = $verifier->verify(
            payment: base64_encode($rawPayment),
            signature: base64_encode($signature),
            customFields: base64_encode(
                'attempt-1|ride-123'
            )
        );

        $this->assertSame(
            $rawPayment,
            $verified['payment']
        );

        $this->assertSame(
            'attempt-1|ride-123',
            $verified['custom_fields']
        );
    }

    public function test_it_rejects_a_tampered_payment_response(): void
    {
        $originalPayment = implode('|', [
            'PKU-R-123-P-1-A01',
            'WXP-REFERENCE-1',
            '2026-08-05 12:30:00',
            '46',
            '00',
            'Approved',
        ]);

        $signature = null;

        $signedSuccessfully = openssl_private_encrypt(
            $originalPayment,
            $signature,
            $this->privateKey,
            OPENSSL_PKCS1_PADDING
        );

        $this->assertTrue(
            $signedSuccessfully
        );

        $tamperedPayment = str_replace(
            '|00|Approved',
            '|15|Declined',
            $originalPayment
        );

        $verifier = new WebxpayResponseVerifier(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY response signature verification failed.'
        );

        $verifier->verify(
            payment: base64_encode($tamperedPayment),
            signature: base64_encode($signature),
            customFields: null
        );
    }

    public function test_it_rejects_malformed_payment_base64(): void
    {
        $verifier = new WebxpayResponseVerifier(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY payment response is invalid.'
        );

        $verifier->verify(
            payment: 'not-valid-base64***',
            signature: base64_encode('unused'),
            customFields: null
        );
    }

    public function test_it_rejects_malformed_signature_base64(): void
    {
        $verifier = new WebxpayResponseVerifier(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY response signature is invalid.'
        );

        $verifier->verify(
            payment: base64_encode(
                'PKU-R-123|WXP-1|2026-08-05 12:30:00|46|00|Approved'
            ),
            signature: 'not-valid-base64***',
            customFields: null
        );
    }

    public function test_it_rejects_malformed_custom_fields_base64(): void
    {
        $rawPayment = implode('|', [
            'PKU-R-123-P-1-A01',
            'WXP-REFERENCE-1',
            '2026-08-05 12:30:00',
            '46',
            '00',
            'Approved',
        ]);

        $signature = null;

        $signedSuccessfully = openssl_private_encrypt(
            $rawPayment,
            $signature,
            $this->privateKey,
            OPENSSL_PKCS1_PADDING
        );

        $this->assertTrue(
            $signedSuccessfully
        );

        $verifier = new WebxpayResponseVerifier(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY custom fields response is invalid.'
        );

        $verifier->verify(
            payment: base64_encode($rawPayment),
            signature: base64_encode($signature),
            customFields: 'not-valid-base64***'
        );
    }
}
