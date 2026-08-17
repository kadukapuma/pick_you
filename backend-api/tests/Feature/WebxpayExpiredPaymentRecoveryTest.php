<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\Payments\WebxpayExpiredPaymentRecovery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayExpiredPaymentRecoveryTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_it_marks_an_expired_processing_attempt_unknown_without_releasing_money(): void
    {
        [$payment, $attempt, $allocation] = $this->scenario(
            now()->subMinute()
        );

        $recovered = app(WebxpayExpiredPaymentRecovery::class)
            ->recoverExpired();

        $this->assertSame(1, $recovered);
        $this->assertSame('UNKNOWN', $attempt->fresh()->status);
        $this->assertSame('UNKNOWN', $payment->fresh()->payment_status);
        $this->assertSame(
            PaymentAllocation::STATUS_RESERVED,
            $allocation->fresh()->status
        );
        $this->assertNull($allocation->fresh()->released_at);
        $this->assertSame(
            1,
            $payment->events()
                ->where('event_type', 'PAYMENT_UNKNOWN')
                ->count()
        );
        $this->assertSame(0, $this->settlementCount($payment));
    }

    public function test_it_is_idempotent_when_recovery_runs_again(): void
    {
        [$payment] = $this->scenario(now()->subMinute());

        $recovery = app(WebxpayExpiredPaymentRecovery::class);

        $this->assertSame(1, $recovery->recoverExpired());
        $this->assertSame(0, $recovery->recoverExpired());
        $this->assertSame(
            1,
            $payment->events()
                ->where('event_type', 'PAYMENT_UNKNOWN')
                ->count()
        );
        $this->assertSame(0, $this->settlementCount($payment));
    }

    public function test_it_does_not_touch_an_unexpired_processing_attempt(): void
    {
        [$payment, $attempt, $allocation] = $this->scenario(
            now()->addMinutes(10)
        );

        $recovered = app(WebxpayExpiredPaymentRecovery::class)
            ->recoverExpired();

        $this->assertSame(0, $recovered);
        $this->assertSame('PROCESSING', $attempt->fresh()->status);
        $this->assertSame('PENDING', $payment->fresh()->payment_status);
        $this->assertSame(
            PaymentAllocation::STATUS_RESERVED,
            $allocation->fresh()->status
        );
        $this->assertSame(0, $payment->events()->count());
        $this->assertSame(0, $this->settlementCount($payment));
    }

    private function scenario(\DateTimeInterface $expiresAt): array
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
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '100.00',
            'transaction_id' => 'expired-recovery-'.uniqid(),
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);
        $allocation = $payment->allocations()->create([
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '100.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => "payment:{$payment->id}:card",
            'reserved_at' => now(),
        ]);
        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-RECOVERY-'.uniqid(),
            'status' => 'PROCESSING',
            'amount' => '100.00',
            'currency' => 'LKR',
            'started_at' => now()->subMinutes(20),
            'expires_at' => $expiresAt,
        ]);

        return [$payment, $attempt, $allocation];
    }

    private function settlementCount(Payment $payment): int
    {
        return JournalEntry::query()
            ->where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)
            ->where('reference_type', Payment::class)
            ->where('reference_id', $payment->id)
            ->count();
    }
}
