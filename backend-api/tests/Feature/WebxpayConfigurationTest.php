<?php

namespace Tests\Feature;

use App\Services\Payments\WebxpayAppResultUrl;
use App\Services\Payments\WebxpayTokenizationClient;
use Tests\TestCase;

class WebxpayConfigurationTest extends TestCase
{
    public function test_laravel_resolves_the_webxpay_app_result_url(): void
    {
        config()->set(
            'payments.webxpay.app_result_url',
            'picku://payments/result'
        );

        $this->app->forgetInstance(
            WebxpayAppResultUrl::class
        );

        $resultUrl = $this->app->make(
            WebxpayAppResultUrl::class
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

    public function test_laravel_resolves_the_webxpay_tokenization_client(): void
    {
        config()->set([
            'payments.webxpay.tokenization.base_url' => 'https://tokenize.test',
            'payments.webxpay.tokenization.username' => 'merchant-user',
            'payments.webxpay.tokenization.password' => 'merchant-password',
            'payments.webxpay.tokenization.token_cache_seconds' => 3300,
        ]);

        $this->app->forgetInstance(
            WebxpayTokenizationClient::class
        );

        $firstClient = $this->app->make(
            WebxpayTokenizationClient::class
        );
        $secondClient = $this->app->make(
            WebxpayTokenizationClient::class
        );

        $this->assertInstanceOf(
            WebxpayTokenizationClient::class,
            $firstClient
        );
        $this->assertSame(
            $firstClient,
            $secondClient
        );
    }
}
