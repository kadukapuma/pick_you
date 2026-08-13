<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\Payments\WebxpayResponseVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayReturnEndpointTest extends TestCase
{
    use BuildsLedgerScenarios;
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
            '40',
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

    public function test_verified_approval_processes_the_known_attempt(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'webxpay-return-payment-1',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $payment->allocations()->create([
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '800.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => "payment:{$payment->id}:card",
            'reserved_at' => now(),
        ]);

        $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-RETURN-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $rawPayment = implode('|', [
            'PKU-RETURN-A01',
            'WXP-RETURN-APPROVED-1',
            '2026-08-05 12:30:00',
            '40',
            '00',
            'Approved',
        ]);

        $verifier = $this->createMock(
            WebxpayResponseVerifier::class
        );

        $verifier
            ->expects($this->exactly(2))
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
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath(
                'data.payment_status',
                'COMPLETED'
            )
            ->assertJsonPath(
                'data.merchant_order_id',
                'PKU-RETURN-A01'
            );
        $this->post(
            '/api/payments/webxpay/return',
            [
                'payment' => 'encoded-payment',
                'signature' => 'encoded-signature',
            ],
            [
                'Accept' => 'text/html',
            ]
        )->assertRedirect(
            'picku://payments/result'
                .'?ride_id='.$ride->id
                .'&payment_id='.$payment->id
                .'&status=COMPLETED'
        );

        $this->assertSame(
            'COMPLETED',
            $payment->refresh()->payment_status
        );

        $this->assertLedgerBalances();
    }
}
