<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayTokenPaymentResultParser;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayTokenPaymentResultParserTest extends TestCase
{
    public function test_it_parses_the_documented_3ds_payment_result(): void
    {
        $encoded = base64_encode(json_encode([
            'Success' => true,
            'Receipt' => 'T25092020I251504',
            'MerchantProvidedOrderNumber' => 'PKU-R29-P18-A01',
        ], JSON_THROW_ON_ERROR));

        $result = (new WebxpayTokenPaymentResultParser)->parse($encoded);

        $this->assertTrue($result->successful);
        $this->assertSame(
            'PKU-R29-P18-A01',
            $result->merchantOrderNumber
        );
        $this->assertSame(
            'T25092020I251504',
            $result->providerReference
        );
    }

    public function test_it_accepts_the_provider_lowercase_result_shape(): void
    {
        $encoded = base64_encode(json_encode([
            'success' => true,
            'receipt' => '622301099052',
            'merchantProvidedOrderNumber' => 'PKU-R29-P18-A01',
            'webxOrderReference' => 'T104982026I11',
        ], JSON_THROW_ON_ERROR));

        $result = (new WebxpayTokenPaymentResultParser)->parse($encoded);

        $this->assertTrue($result->successful);
        $this->assertSame('T104982026I11', $result->providerReference);
    }

    public function test_it_parses_a_failed_3ds_payment_result(): void
    {
        $encoded = base64_encode(json_encode([
            'Success' => false,
            'MerchantProvidedOrderNumber' => 'PKU-R29-P18-A01',
        ], JSON_THROW_ON_ERROR));

        $result = (new WebxpayTokenPaymentResultParser)->parse($encoded);

        $this->assertFalse($result->successful);
        $this->assertNull($result->providerReference);
    }

    public function test_it_rejects_malformed_base64(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY token payment result is invalid.'
        );

        (new WebxpayTokenPaymentResultParser)->parse('%%%invalid%%%');
    }

    public function test_it_rejects_success_without_a_reference(): void
    {
        $encoded = base64_encode(json_encode([
            'Success' => true,
            'MerchantProvidedOrderNumber' => 'PKU-R29-P18-A01',
        ], JSON_THROW_ON_ERROR));

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY token payment reference is invalid.'
        );

        (new WebxpayTokenPaymentResultParser)->parse($encoded);
    }
}
