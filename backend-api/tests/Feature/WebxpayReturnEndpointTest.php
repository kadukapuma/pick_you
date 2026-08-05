<?php

namespace Tests\Feature;

use App\Services\Payments\WebxpayResponseVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class WebxpayReturnEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_return_rejects_missing_required_fields(): void
    {
        $this->postJson(
            '/api/payments/webxpay/return'
        )
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'payment',
                'signature',
            ]);
    }

    public function test_return_rejects_an_invalid_signature(): void
    {
        $verifier = $this->createMock(
            WebxpayResponseVerifier::class
        );

        $verifier
            ->expects($this->once())
            ->method('verify')
            ->with(
                'encoded-payment',
                'encoded-signature',
                null
            )
            ->willThrowException(
                new RuntimeException(
                    'WEBXPAY response signature verification failed.'
                )
            );

        $this->app->instance(
            WebxpayResponseVerifier::class,
            $verifier
        );

        $this->postJson(
            '/api/payments/webxpay/return',
            [
                'payment' => 'encoded-payment',
                'signature' => 'encoded-signature',
            ]
        )
            ->assertStatus(400)
            ->assertJsonPath(
                'message',
                'Invalid WEBXPAY response.'
            );
    }

    public function test_verified_return_rejects_an_unknown_order_id(): void
    {
        $rawPayment = implode('|', [
            'PKU-UNKNOWN-A01',
            'WXP-REFERENCE-UNKNOWN',
            '2026-08-05 12:30:00',
            '46',
            '00',
            'Approved',
        ]);

        $verifier = $this->createMock(
            WebxpayResponseVerifier::class
        );

        $verifier
            ->expects($this->once())
            ->method('verify')
            ->willReturn([
                'payment' => $rawPayment,
                'custom_fields' => '',
            ]);

        $this->app->instance(
            WebxpayResponseVerifier::class,
            $verifier
        );

        $this->postJson(
            '/api/payments/webxpay/return',
            [
                'payment' => 'encoded-payment',
                'signature' => 'encoded-signature',
            ]
        )
            ->assertNotFound()
            ->assertJsonPath(
                'message',
                'WEBXPAY payment attempt was not found.'
            );
    }
}
