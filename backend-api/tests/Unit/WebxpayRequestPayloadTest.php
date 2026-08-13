<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayRequestPayload;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayRequestPayloadTest extends TestCase
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
            throw new RuntimeException('Unable to create the test RSA key pair.');
        }

        if (! openssl_pkey_export($keyPair, $this->privateKey)) {
            throw new RuntimeException('Unable to export the test private key.');
        }

        $details = openssl_pkey_get_details($keyPair);

        if ($details === false) {
            throw new RuntimeException('Unable to read the test public key.');
        }

        $path = tempnam(sys_get_temp_dir(), 'webxpay-test-');

        if ($path === false) {
            throw new RuntimeException('Unable to create the test key file.');
        }

        $this->publicKeyPath = $path;
        file_put_contents($this->publicKeyPath, $details['key']);
    }

    protected function tearDown(): void
    {
        if (isset($this->publicKeyPath) && is_file($this->publicKeyPath)) {
            unlink($this->publicKeyPath);
        }

        parent::tearDown();
    }

    public function test_it_encrypts_order_id_and_two_decimal_amount(): void
    {
        $payload = new WebxpayRequestPayload($this->publicKeyPath);

        $encryptedPayment = $payload->encrypt(
            'PKU-R-123-A-1',
            '300.00'
        );

        $encryptedBinary = base64_decode(
            $encryptedPayment,
            true
        );

        $this->assertNotFalse($encryptedBinary);

        $decrypted = null;

        $decryptedSuccessfully = openssl_private_decrypt(
            $encryptedBinary,
            $decrypted,
            $this->privateKey,
            OPENSSL_PKCS1_PADDING
        );

        $this->assertTrue($decryptedSuccessfully);
        $this->assertSame(
            'PKU-R-123-A-1|300.00',
            $decrypted
        );
    }

    public function test_it_rejects_an_order_id_containing_the_field_separator(): void
    {
        $payload = new WebxpayRequestPayload(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY merchant order ID is invalid.'
        );

        $payload->encrypt(
            'PKU-R-123|ATTACK',
            '300.00'
        );
    }

    public function test_it_rejects_an_amount_that_is_not_two_decimal_lkr(): void
    {
        $payload = new WebxpayRequestPayload(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY payment amount is invalid.'
        );

        $payload->encrypt(
            'PKU-R-123-A-1',
            '300.0'
        );
    }

    public function test_it_rejects_an_amount_below_one_lkr(): void
    {
        $payload = new WebxpayRequestPayload(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY payment amount must be at least 1.00 LKR.'
        );

        $payload->encrypt(
            'PKU-R-123-A-1',
            '0.99'
        );
    }

    public function test_it_fails_safely_when_the_public_key_file_is_missing(): void
    {
        $missingKeyPath = $this->publicKeyPath.'-missing';

        $payload = new WebxpayRequestPayload(
            $missingKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY public key file was not found.'
        );

        $payload->encrypt(
            'PKU-R-123-A-1',
            '300.00'
        );
    }

    public function test_it_fails_safely_when_the_public_key_is_invalid(): void
    {
        file_put_contents(
            $this->publicKeyPath,
            'this is not a public key'
        );

        $payload = new WebxpayRequestPayload(
            $this->publicKeyPath
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY public key is invalid.'
        );

        $payload->encrypt(
            'PKU-R-123-A-1',
            '300.00'
        );
    }
}
