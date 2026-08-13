<?php

namespace Tests\Unit;

use App\Services\Payments\WebxpayAppResultUrl;
use PHPUnit\Framework\TestCase;
use RuntimeException;

class WebxpayAppResultUrlTest extends TestCase
{
    public function test_it_builds_the_passenger_app_result_url(): void
    {
        $resultUrl = new WebxpayAppResultUrl(
            'picku://payments/result'
        );

        $this->assertSame(
            'picku://payments/result'
                .'?ride_id=28'
                .'&payment_id=17'
                .'&status=COMPLETED',
            $resultUrl->forPayment(
                rideId: 28,
                paymentId: 17,
                status: 'COMPLETED'
            )
        );
    }

    public function test_it_rejects_an_empty_result_url(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY app result URL is invalid.'
        );

        new WebxpayAppResultUrl('');
    }

    public function test_it_rejects_a_non_picku_result_url(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(
            'WEBXPAY app result URL is invalid.'
        );

        new WebxpayAppResultUrl(
            'https://untrusted.example/payments/result'
        );
    }
}
