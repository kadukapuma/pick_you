<?php

namespace Tests\Feature;

use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\WebxpayTokenPaymentOperation;
use App\Services\Payments\LoyaltyPointsService;
use App\Services\Payments\PassengerCreditService;
use App\Services\Payments\WebxpayOutcomeProcessor;
use App\Services\Payments\WebxpayTokenPaymentCallbackProcessor;
use App\Services\Payments\WebxpayTokenPaymentResultParser;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenPaymentCallbackProcessorTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_verified_success_completes_once(): void
    {
        [$operation, $attempt, $payment, $token] = $this->scenario();
        $payment->update(['payment_status' => 'COMPLETED']);
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')
            ->once()
            ->withArgs(fn ($receivedAttempt, $parsed) => $receivedAttempt->is($attempt)
                && $parsed['provider_reference'] === 'T25092020I251504'
                && $parsed['status_code'] === '00'
                && $parsed['transaction_amount'] === '100.00'
            )
            ->andReturn($payment->fresh());
        $credits = Mockery::mock(PassengerCreditService::class);
        $credits->expects('release')->never();
        $processor = new WebxpayTokenPaymentCallbackProcessor(
            new WebxpayTokenPaymentResultParser,
            $outcome,
            $credits,
            app(LoyaltyPointsService::class)
        );
        $encoded = $this->encodedResult([
            'Success' => true,
            'Receipt' => 'T25092020I251504',
            'MerchantProvidedOrderNumber' => $attempt->merchant_order_id,
        ]);

        $first = $processor->process($operation, $token, $encoded);
        $second = $processor->process($operation, $token, $encoded);

        $this->assertSame($payment->id, $first->id);
        $this->assertSame($payment->id, $second->id);
        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_COMPLETED,
            $operation->fresh()->status
        );
    }

    public function test_failed_3ds_releases_card_and_marks_payment_declined(): void
    {
        [$operation, $attempt, $payment, $token] = $this->scenario();
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();
        $credits = Mockery::mock(PassengerCreditService::class);
        $credits->expects('release')->never();
        $processor = new WebxpayTokenPaymentCallbackProcessor(
            new WebxpayTokenPaymentResultParser,
            $outcome,
            $credits,
            app(LoyaltyPointsService::class)
        );

        $result = $processor->process($operation, $token, $this->encodedResult([
            'Success' => false,
            'MerchantProvidedOrderNumber' => $attempt->merchant_order_id,
        ]));

        $this->assertSame('DECLINED', $result->payment_status);
        $this->assertSame('DECLINED', $attempt->fresh()->status);
        $this->assertSame(
            'RELEASED',
            $payment->allocations()->where('type', 'CARD')->sole()->status
        );
        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_FAILED,
            $operation->fresh()->status
        );
        $this->assertSame(1, $payment->events()
            ->where('event_type', 'PAYMENT_DECLINED')->count());
    }

    public function test_invalid_callback_token_is_rejected_before_parsing(): void
    {
        [$operation] = $this->scenario();
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();
        $credits = Mockery::mock(PassengerCreditService::class);
        $credits->expects('release')->never();
        $processor = new WebxpayTokenPaymentCallbackProcessor(
            new WebxpayTokenPaymentResultParser,
            $outcome,
            $credits,
            app(LoyaltyPointsService::class)
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage(
            'WEBXPAY token payment callback token is invalid.'
        );

        $processor->process($operation, str_repeat('x', 64), 'invalid');
    }

    public function test_failed_3ds_releases_reserved_picku_credit(): void
    {
        [$operation, $attempt, $payment, $token] = $this->scenario();
        $passenger = $payment->passenger;
        $passenger->update([
            'wallet_balance' => '9960.00',
            'wallet_reserved_balance' => '40.00',
        ]);
        $payment->allocations()
            ->where('type', PaymentAllocation::TYPE_CARD)
            ->update(['amount' => '60.00']);
        $attempt->update(['amount' => '60.00']);
        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'type' => PaymentAllocation::TYPE_PICKU_CREDIT,
            'amount' => '40.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => 'payment:'.$payment->id.':credit',
            'reserved_at' => now(),
        ]);
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();
        $processor = new WebxpayTokenPaymentCallbackProcessor(
            new WebxpayTokenPaymentResultParser,
            $outcome,
            app(PassengerCreditService::class),
            app(LoyaltyPointsService::class)
        );

        $processor->process($operation, $token, $this->encodedResult([
            'Success' => false,
            'MerchantProvidedOrderNumber' => $attempt->merchant_order_id,
        ]));

        $this->assertSame('10000.00', $passenger->fresh()->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->fresh()->wallet_reserved_balance
        );
        $this->assertSame(
            PaymentAllocation::STATUS_RELEASED,
            $payment->allocations()
                ->where('type', PaymentAllocation::TYPE_PICKU_CREDIT)
                ->sole()->status
        );
    }

    public function test_mismatched_order_number_is_rejected(): void
    {
        [$operation, , , $token] = $this->scenario();
        $outcome = Mockery::mock(WebxpayOutcomeProcessor::class);
        $outcome->expects('process')->never();
        $credits = Mockery::mock(PassengerCreditService::class);
        $credits->expects('release')->never();
        $processor = new WebxpayTokenPaymentCallbackProcessor(
            new WebxpayTokenPaymentResultParser,
            $outcome,
            $credits,
            app(LoyaltyPointsService::class)
        );

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage(
            'WEBXPAY token payment result does not match the attempt.'
        );

        $processor->process($operation, $token, $this->encodedResult([
            'Success' => true,
            'Receipt' => 'T25092020I251504',
            'MerchantProvidedOrderNumber' => 'PKU-WRONG-ORDER',
        ]));
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
            'transaction_id' => 'token-callback-'.uniqid(),
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
        PaymentAllocation::create([
            'payment_id' => $payment->id,
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '100.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => 'payment:'.$payment->id.':card',
            'reserved_at' => now(),
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

        return [$operation, $attempt, $payment, $token];
    }

    private function encodedResult(array $payload): string
    {
        return base64_encode(json_encode($payload, JSON_THROW_ON_ERROR));
    }
}
