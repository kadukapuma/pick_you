<?php

namespace Tests\Feature;

use App\Services\Payments\WebxpayAppResultUrl;
use App\Services\Payments\WebxpayCheckoutRequest;
use App\Services\Payments\WebxpayRequestPayload;
use App\Services\Payments\WebxpayResponseParser;
use App\Services\Payments\WebxpayResponseVerifier;
use Tests\TestCase;

class WebxpayConfigurationTest extends TestCase
{
    public function test_laravel_resolves_the_webxpay_request_services(): void
    {
        config()->set([
            'payments.webxpay.public_key_path' => 'storage/app/payment-keys/test.pem',
            'payments.webxpay.secret_key' => 'test-secret',
            'payments.webxpay.payment_gateway_id' => '',
            'payments.webxpay.response_gateway_id' => '40',
            'payments.webxpay.currency' => 'LKR',
            'payments.webxpay.encryption_method' => 'test-encryption-method',
        ]);

        $this->app->forgetInstance(
            WebxpayRequestPayload::class
        );

        $this->app->forgetInstance(
            WebxpayCheckoutRequest::class
        );

        $this->app->forgetInstance(
            WebxpayResponseVerifier::class
        );

        $this->app->forgetInstance(
            WebxpayResponseParser::class
        );

        $firstRequest = $this->app->make(
            WebxpayCheckoutRequest::class
        );

        $secondRequest = $this->app->make(
            WebxpayCheckoutRequest::class
        );

        $firstVerifier = $this->app->make(
            WebxpayResponseVerifier::class
        );

        $secondVerifier = $this->app->make(
            WebxpayResponseVerifier::class
        );

        $firstParser = $this->app->make(
            WebxpayResponseParser::class
        );

        $secondParser = $this->app->make(
            WebxpayResponseParser::class
        );

        $this->assertInstanceOf(
            WebxpayCheckoutRequest::class,
            $firstRequest
        );

        $this->assertSame(
            $firstRequest,
            $secondRequest
        );

        $this->assertInstanceOf(
            WebxpayResponseVerifier::class,
            $firstVerifier
        );

        $this->assertSame(
            $firstVerifier,
            $secondVerifier
        );

        $this->assertInstanceOf(
            WebxpayResponseParser::class,
            $firstParser
        );

        $this->assertSame(
            $firstParser,
            $secondParser
        );
    }

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
}
