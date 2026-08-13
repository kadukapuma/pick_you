<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\WebxpayTokenPaymentOperation;
use App\Services\Payments\WebxpayTokenPaymentCallbackProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenPaymentReturnEndpointTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set(
            'payments.webxpay.app_result_url',
            'picku://payments/result'
        );
    }

    public function test_missing_callback_fields_are_rejected(): void
    {
        [$attempt] = $this->scenario();

        $this->getJson(
            "/payments/webxpay/token/{$attempt->id}/return"
        )->assertUnprocessable();
    }

    public function test_verified_callback_redirects_to_passenger_app(): void
    {
        [$attempt, $payment, $operation, $token] = $this->scenario();
        $payment->update(['payment_status' => 'COMPLETED']);
        $processor = Mockery::mock(
            WebxpayTokenPaymentCallbackProcessor::class
        );
        $processor->expects('process')
            ->once()
            ->withArgs(fn ($receivedOperation, $receivedToken, $result) => $receivedOperation->is($operation)
                && $receivedToken === $token
                && $result === 'encoded-result'
            )
            ->andReturn($payment->fresh());
        $this->app->instance(
            WebxpayTokenPaymentCallbackProcessor::class,
            $processor
        );

        $this->get(
            "/payments/webxpay/token/{$attempt->id}/return?"
            .http_build_query([
                'token' => $token,
                'result3ds' => 'encoded-result',
            ])
        )->assertRedirect(
            'picku://payments/result'
                .'?ride_id='.$payment->ride_id
                .'&payment_id='.$payment->id
                .'&status=COMPLETED'
        );
    }

    public function test_unknown_operation_is_rejected(): void
    {
        [$attempt, , $operation, $token] = $this->scenario();
        $operation->delete();
        $processor = Mockery::mock(
            WebxpayTokenPaymentCallbackProcessor::class
        );
        $processor->expects('process')->never();
        $this->app->instance(
            WebxpayTokenPaymentCallbackProcessor::class,
            $processor
        );

        $this->getJson(
            "/payments/webxpay/token/{$attempt->id}/return?"
            .http_build_query([
                'token' => $token,
                'result3ds' => 'encoded-result',
            ])
        )->assertNotFound()->assertJsonPath(
            'message',
            'WEBXPAY saved-card operation was not found.'
        );
    }

    private function scenario(): array
    {
        [, $passenger] = $this->makePassenger();
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
            'transaction_id' => 'token-return-'.uniqid(),
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
        $token = str_repeat('a', 64);
        $operation = WebxpayTokenPaymentOperation::create([
            'passenger_id' => $passenger->id,
            'passenger_payment_method_id' => $method->id,
            'payment_attempt_id' => $attempt->id,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $passenger->user->email,
            'callback_token_hash' => hash('sha256', $token),
            'status' => WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED,
            'expires_at' => now()->addMinutes(15),
        ]);

        return [$attempt, $payment, $operation, $token];
    }
}
