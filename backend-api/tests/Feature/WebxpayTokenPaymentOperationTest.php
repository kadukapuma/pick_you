<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\WebxpayTokenPaymentOperation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayTokenPaymentOperationTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_operation_tracks_the_saved_card_payment_lifecycle(): void
    {
        [$operation, $method, $attempt] = $this->makeOperation();

        $this->assertSame($attempt->id, $operation->paymentAttempt->id);
        $this->assertSame($method->id, $operation->paymentMethod->id);
        $this->assertFalse($operation->isExpired());

        $operation->markThreeDsRequired();
        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_THREE_DS_REQUIRED,
            $operation->fresh()->status
        );

        $operation->markCompleted();
        $operation = $operation->fresh();

        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_COMPLETED,
            $operation->status
        );
        $this->assertNotNull($operation->completed_at);
        $this->assertArrayNotHasKey(
            'callback_token_hash',
            $operation->toArray()
        );
    }

    public function test_operation_detects_expiry_and_records_only_safe_failure(): void
    {
        [$operation] = $this->makeOperation(now()->subSecond());

        $this->assertTrue($operation->isExpired());

        $operation->markFailed(
            'PROVIDER_ERROR',
            'Saved-card payment could not be completed.'
        );
        $operation = $operation->fresh();

        $this->assertSame(
            WebxpayTokenPaymentOperation::STATUS_FAILED,
            $operation->status
        );
        $this->assertSame('PROVIDER_ERROR', $operation->failure_code);
        $this->assertSame(
            'Saved-card payment could not be completed.',
            $operation->failure_reason
        );
        $this->assertNotNull($operation->completed_at);
    }

    private function makeOperation($expiresAt = null): array
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
        $method = $this->makeCard($passenger);
        $method->update([
            'gateway' => 'webxpay',
            'token' => 'provider-card-'.$method->id,
        ]);
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '100.00',
            'transaction_id' => 'token-operation-'.uniqid(),
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
        $operation = WebxpayTokenPaymentOperation::create([
            'passenger_id' => $passenger->id,
            'passenger_payment_method_id' => $method->id,
            'payment_attempt_id' => $attempt->id,
            'customer_id' => 'picku-passenger-'.$passenger->id,
            'customer_email' => $passenger->user->email,
            'callback_token_hash' => hash('sha256', str_repeat('a', 64)),
            'status' => WebxpayTokenPaymentOperation::STATUS_PROCESSING,
            'expires_at' => $expiresAt ?? now()->addMinutes(15),
        ]);

        return [$operation, $method, $attempt];
    }
}
