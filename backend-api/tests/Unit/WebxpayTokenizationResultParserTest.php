<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayTokenizationResultParser;
use RuntimeException;
use Tests\TestCase;

class WebxpayTokenizationResultParserTest extends TestCase
{
    public function test_it_parses_a_successful_card_result(): void
    {
        $result = (new WebxpayTokenizationResultParser)->parse(
            $this->encode([
                'success' => true,
                'customer' => [
                    'id' => 'picku-passenger-9',
                    'email' => 'passenger@example.test',
                ],
                'card' => [
                    'id' => 'provider-card-id',
                    'cardLast' => '1111',
                    'scheme' => 'VISA',
                    'expiry' => '1230',
                ],
            ])
        );

        $this->assertTrue($result->successful);
        $this->assertSame('picku-passenger-9', $result->customerId);
        $this->assertSame(
            'passenger@example.test',
            $result->customerEmail
        );
        $this->assertSame('provider-card-id', $result->providerCardId);
    }

    public function test_it_parses_a_failed_3ds_result_without_a_card(): void
    {
        $result = (new WebxpayTokenizationResultParser)->parse(
            $this->encode([
                'success' => false,
                'customer' => [
                    'id' => 'picku-passenger-9',
                    'email' => 'passenger@example.test',
                ],
            ])
        );

        $this->assertFalse($result->successful);
        $this->assertNull($result->providerCardId);
    }

    public function test_it_rejects_malformed_base64(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization result is invalid.'
        );

        (new WebxpayTokenizationResultParser)->parse('not-base64%%%');
    }

    public function test_success_result_requires_a_provider_card_id(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY tokenization card result is invalid.'
        );

        (new WebxpayTokenizationResultParser)->parse(
            $this->encode([
                'success' => true,
                'customer' => [
                    'id' => 'picku-passenger-9',
                    'email' => 'passenger@example.test',
                ],
                'card' => [],
            ])
        );
    }

    /**
     * @param  array<string, mixed>  $value
     */
    private function encode(array $value): string
    {
        return base64_encode(
            json_encode($value, JSON_THROW_ON_ERROR)
        );
    }
}
