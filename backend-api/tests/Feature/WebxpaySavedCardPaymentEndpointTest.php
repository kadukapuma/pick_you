<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\WebxpayTokenPaymentOperation;
use App\Services\Payments\WebxpaySavedCardPaymentStarter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Mockery;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpaySavedCardPaymentEndpointTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set([
            'app.url' => 'https://api.picku.test',
            'payments.webxpay.enabled' => true,
            'payments.webxpay.tokenization.enabled' => true,
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->postJson(
            '/api/rides/999/payments/webxpay/attempts/999/saved-card',
            ['payment_method_id' => 1],
            ['Idempotency-Key' => 'token-payment-unauthenticated']
        )->assertUnauthorized();
    }

    public function test_passenger_cannot_use_another_passengers_saved_card(): void
    {
        [$user, , $ride, $attempt] = $this->scenario();
        [, $otherPassenger] = $this->makePassenger('0779999999');
        $otherCard = PassengerPaymentMethod::create([
            'passenger_id' => $otherPassenger->id,
            'gateway' => 'webxpay',
            'token' => 'other-provider-card',
            'brand' => 'visa',
            'last4' => '9999',
            'exp_month' => 12,
            'exp_year' => now()->addYear()->year,
            'is_default' => true,
        ]);
        Sanctum::actingAs($user, ['role:passenger']);
        $starter = Mockery::mock(WebxpaySavedCardPaymentStarter::class);
        $starter->expects('start')->never();
        $this->app->instance(WebxpaySavedCardPaymentStarter::class, $starter);

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/attempts/{$attempt->id}/saved-card",
            ['payment_method_id' => $otherCard->id],
            ['Idempotency-Key' => 'token-payment-other-card']
        )
            ->assertNotFound()
            ->assertJsonPath(
                'message',
                'WEBXPAY payment method not found.'
            );
    }

    public function test_passenger_can_start_payment_using_only_local_card_id(): void
    {
        [$user, $passenger, $ride, $attempt, $method, $payment] = $this->scenario();
        Sanctum::actingAs($user, ['role:passenger']);
        $operation = WebxpayTokenPaymentOperation::create([
            'passenger_id' => $passenger->id,
            'passenger_payment_method_id' => $method->id,
            'payment_attempt_id' => $attempt->id,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $user->email,
            'callback_token_hash' => hash('sha256', str_repeat('a', 64)),
            'status' => WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED,
            'expires_at' => now()->addMinutes(15),
        ]);
        $starter = Mockery::mock(WebxpaySavedCardPaymentStarter::class);
        $starter->expects('start')
            ->once()
            ->withArgs(fn ($receivedPassenger, $receivedAttempt, $receivedMethod, $url) => $receivedPassenger->is($passenger)
                && $receivedAttempt->is($attempt)
                && $receivedMethod->is($method)
                && $url === "https://api.picku.test/payments/webxpay/token/{$attempt->id}/return"
            )
            ->andReturn([
                'operation' => $operation,
                'payment' => $payment,
                'three_ds_url' => 'https://tokenize.test/3ds/challenge',
            ]);
        $this->app->instance(WebxpaySavedCardPaymentStarter::class, $starter);

        $response = $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/attempts/{$attempt->id}/saved-card",
            ['payment_method_id' => $method->id],
            ['Idempotency-Key' => 'token-payment-start-success']
        )
            ->assertCreated()
            ->assertJsonPath('data.payment_id', $payment->id)
            ->assertJsonPath('data.attempt_id', $attempt->id)
            ->assertJsonPath('data.operation_id', $operation->id)
            ->assertJsonPath('data.requires_3ds', true)
            ->assertJsonPath(
                'data.three_ds_url',
                'https://tokenize.test/3ds/challenge'
            );

        $this->assertArrayNotHasKey(
            'token',
            $response->json('data')
        );
        $this->assertStringNotContainsString(
            'provider-card-id',
            $response->getContent()
        );
    }

    private function scenario(): array
    {
        [$user, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $this->makeFareConfig(),
            100,
            'card'
        );
        $method = PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => 'webxpay',
            'token' => 'provider-card-id',
            'brand' => 'visa',
            'last4' => '1111',
            'exp_month' => 12,
            'exp_year' => now()->addYear()->year,
            'is_default' => true,
        ]);
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '100.00',
            'transaction_id' => 'saved-card-endpoint-'.uniqid(),
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);
        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-TOKEN-'.uniqid(),
            'status' => 'PROCESSING',
            'amount' => '100.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        return [$user, $passenger, $ride, $attempt, $method, $payment];
    }
}
