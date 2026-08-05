<?php

namespace Tests\Feature;

use App\Services\Payments\WebxpayCheckoutRequest;
use App\Services\Payments\WebxpayRequestPayload;
use Tests\TestCase;

class WebxpayConfigurationTest extends TestCase
{
    public function test_laravel_resolves_the_webxpay_request_services(): void
    {
        config()->set([
            'payments.webxpay.public_key_path' => 'storage/app/payment-keys/test.pem',
            'payments.webxpay.secret_key' => 'test-secret',
            'payments.webxpay.payment_gateway_id' => 46,
            'payments.webxpay.currency' => 'LKR',
            'payments.webxpay.encryption_method' => 'test-encryption-method',
        ]);

        $this->app->forgetInstance(
            WebxpayRequestPayload::class
        );

        $this->app->forgetInstance(
            WebxpayCheckoutRequest::class
        );

        $first = $this->app->make(
            WebxpayCheckoutRequest::class
        );

        $second = $this->app->make(
            WebxpayCheckoutRequest::class
        );

        $this->assertInstanceOf(
            WebxpayCheckoutRequest::class,
            $first
        );

        $this->assertSame(
            $first,
            $second
        );
    }
}
