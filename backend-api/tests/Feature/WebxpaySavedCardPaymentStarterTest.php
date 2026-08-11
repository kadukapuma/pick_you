<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\WebxpayTokenPaymentOperation;
use App\Services\Payments\WebxpayOutcomeProcessor;
use App\Services\Payments\WebxpaySavedCardPaymentStarter;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationClient;
use App\Services\Payments\WebxpayTokenPaymentResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpaySavedCardPaymentStarterTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_it_completes_an_immediately_approved_saved_card_payment(): void
    {
        [$passenger, $method, $attempt, $payment] = $this->scenario();
        $client = Mockery::mock(WebxpayTokenizationClient::class);
        $client->expects('payWithToken')
            ->once()
            ->withArgs(fn (...$arguments) => $arguments[0] === 'provider-card-id'
                && $arguments[1] === '100.00'
                && $arguments[2] === $attempt->merchant_order_id
                && str_starts_with(
                    $arguments[4],
                    'https://api.picku.test/token-payment/return?token='
                )
                && $arguments[5] === 'picku-passenger-'.$passenger->id
            )
            ->andReturn(WebxpayTokenPaymentResult::completed('T104982026I11'));
        $synchronizer = Mockery::mock(WebxpaySavedCardSynchronizer::class);
        $synchronizer->expects('customerId')
            ->once()
            ->andReturn('picku-passenger-'.$passenger->id);
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')
            ->once()
            ->withArgs(fn ($receivedAttempt, $parsed) => $receivedAttempt->is($attempt)
                && $parsed['status_code'] === '00'
                && $parsed['provider_reference'] === 'T104982026I11'
                && $parsed['transaction_amount'] === '100.00'
            )
            ->andReturn($payment);

        $result = (new WebxpaySavedCardPaymentStarter(
            $client,
            $synchronizer,
            $outcome
        ))->start(
            $passenger,
            $attempt,
            $method,
            'https://api.picku.test/token-payment/return'
        );

        $this->assertNull($result['three_ds_url']);
        $this->assertSame($payment->id, $result['payment']->id);
        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_COMPLETED,
            $result['operation']->status
        );
        $this->assertSame(64, strlen((string) $result['operation']->getRawOriginal(
            'callback_token_hash'
        )));
    }

    public function test_it_tracks_a_trusted_3ds_redirect_without_completing_payment(): void
    {
        [$passenger, $method, $attempt] = $this->scenario();
        $client = Mockery::mock(WebxpayTokenizationClient::class);
        $client->expects('payWithToken')->once()->andReturn(
            WebxpayTokenPaymentResult::threeDsRequired(
                'https://tokenize.test/3ds/payment-challenge'
            )
        );
        $synchronizer = Mockery::mock(WebxpaySavedCardSynchronizer::class);
        $synchronizer->expects('customerId')
            ->once()
            ->andReturn('picku-passenger-'.$passenger->id);
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();

        $result = (new WebxpaySavedCardPaymentStarter(
            $client,
            $synchronizer,
            $outcome
        ))->start(
            $passenger,
            $attempt,
            $method,
            'https://api.picku.test/token-payment/return'
        );

        $this->assertSame(
            'https://tokenize.test/3ds/payment-challenge',
            $result['three_ds_url']
        );
        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED,
            $result['operation']->status
        );
        $this->assertSame('PROCESSING', $attempt->fresh()->status);
    }

    public function test_it_rejects_another_passengers_saved_card_before_provider_io(): void
    {
        [$passenger, , $attempt] = $this->scenario();
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
        $client = Mockery::mock(WebxpayTokenizationClient::class);
        $client->expects('payWithToken')->never();
        $synchronizer = Mockery::mock(WebxpaySavedCardSynchronizer::class);
        $synchronizer->expects('customerId')->never();
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage(
            'WEBXPAY saved card does not belong to this passenger.'
        );

        (new WebxpaySavedCardPaymentStarter(
            $client,
            $synchronizer,
            $outcome
        ))->start(
            $passenger,
            $attempt,
            $otherCard,
            'https://api.picku.test/token-payment/return'
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
            'transaction_id' => 'saved-card-starter-'.uniqid(),
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

        return [$passenger, $method, $attempt, $payment];
    }
}
