<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayResponseParser;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayResponseParserTest extends TestCase
{
    public function test_it_parses_the_official_php_sample_order(): void
    {
        $parser = new WebxpayResponseParser(
            expectedGatewayId: '46'
        );

        $parsed = $parser->parse(
            implode('|', [
                'PKU-R-123-P-1-A01',
                'WXP-REFERENCE-1',
                '2026-08-05 12:30:00',
                '46',
                '00',
                'Approved',
            ])
        );

        $this->assertSame(
            [
                'merchant_order_id' => 'PKU-R-123-P-1-A01',
                'provider_reference' => 'WXP-REFERENCE-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '00',
                'comment' => 'Approved',
            ],
            $parsed
        );
    }

    public function test_it_parses_the_main_guide_order(): void
    {
        $parser = new WebxpayResponseParser(
            expectedGatewayId: '46'
        );

        $parsed = $parser->parse(
            implode('|', [
                'PKU-R-123-P-1-A01',
                'WXP-REFERENCE-1',
                '2026-08-05 12:30:00',
                '15',
                'Declined',
                '46',
            ])
        );

        $this->assertSame(
            [
                'merchant_order_id' => 'PKU-R-123-P-1-A01',
                'provider_reference' => 'WXP-REFERENCE-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '15',
                'comment' => 'Declined',
            ],
            $parsed
        );
    }

    public function test_it_rejects_an_ambiguous_response_order(): void
    {
        $parser = new WebxpayResponseParser(
            expectedGatewayId: '46'
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY payment response format is ambiguous.'
        );

        $parser->parse(
            implode('|', [
                'PKU-R-123-P-1-A01',
                'WXP-REFERENCE-1',
                '2026-08-05 12:30:00',
                '46',
                '00',
                '46',
            ])
        );
    }

    public function test_it_rejects_an_unexpected_gateway(): void
    {
        $parser = new WebxpayResponseParser(
            expectedGatewayId: '46'
        );

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY payment response gateway is invalid.'
        );

        $parser->parse(
            implode('|', [
                'PKU-R-123-P-1-A01',
                'WXP-REFERENCE-1',
                '2026-08-05 12:30:00',
                '99',
                '00',
                'Approved',
            ])
        );
    }
}
