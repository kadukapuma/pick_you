<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\Payments\WebxpayOutcomeProcessor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayOutcomeProcessorTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_verified_approval_completes_and_settles_payment(): void
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
            'transaction_id' => 'webxpay-outcome-payment-1',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $allocation = $payment->allocations()->create([
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '800.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => "payment:{$payment->id}:card",
            'reserved_at' => now(),
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-OUTCOME-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $result = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-OUTCOME-A01',
                'provider_reference' => 'WXP-APPROVED-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '00',
                'comment' => 'Approved',
            ]
        );

        $replayed = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-OUTCOME-A01',
                'provider_reference' => 'WXP-APPROVED-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '00',
                'comment' => 'Approved',
            ]
        );

        $this->assertSame(
            $result->id,
            $replayed->id
        );

        $this->assertSame(
            1,
            $payment->events()
                ->where('event_type', 'PAYMENT_COMPLETED')
                ->count()
        );

        $this->assertSame(
            'COMPLETED',
            $result->payment_status
        );

        $attempt->refresh();

        $this->assertSame(
            'COMPLETED',
            $attempt->status
        );
        $this->assertSame(
            'WXP-APPROVED-1',
            $attempt->gateway_reference
        );
        $this->assertSame(
            '00',
            $attempt->provider_status
        );
        $this->assertNotNull(
            $attempt->completed_at
        );

        $allocation->refresh();

        $this->assertSame(
            PaymentAllocation::STATUS_COMPLETED,
            $allocation->status
        );
        $this->assertNotNull(
            $allocation->completed_at
        );

        $this->assertSame(
            1,
            JournalEntry::query()
                ->where(
                    'type',
                    JournalEntry::TYPE_RIDE_SETTLEMENT
                )
                ->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_verified_decline_releases_card_without_settlement(): void
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
            'transaction_id' => 'webxpay-declined-payment-1',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $allocation = $payment->allocations()->create([
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '800.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => "payment:{$payment->id}:card",
            'reserved_at' => now(),
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-DECLINED-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $result = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-DECLINED-A01',
                'provider_reference' => 'WXP-DECLINED-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '15',
                'comment' => 'Declined',
            ]
        );
        $replayed = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-DECLINED-A01',
                'provider_reference' => 'WXP-DECLINED-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '15',
                'comment' => 'Declined',
            ]
        );

        $this->assertSame(
            $result->id,
            $replayed->id
        );

        $this->assertSame(
            1,
            $payment->events()
                ->where('event_type', 'PAYMENT_DECLINED')
                ->count()
        );

        $this->assertSame(
            'DECLINED',
            $result->payment_status
        );

        $attempt->refresh();

        $this->assertSame(
            'DECLINED',
            $attempt->status
        );
        $this->assertSame(
            'WXP-DECLINED-1',
            $attempt->gateway_reference
        );
        $this->assertSame(
            '15',
            $attempt->provider_status
        );
        $this->assertSame(
            'Declined',
            $attempt->failure_reason
        );
        $this->assertNotNull(
            $attempt->completed_at
        );

        $allocation->refresh();

        $this->assertSame(
            PaymentAllocation::STATUS_RELEASED,
            $allocation->status
        );
        $this->assertNotNull(
            $allocation->released_at
        );

        $this->assertSame(
            0,
            JournalEntry::query()->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_unknown_result_keeps_allocations_reserved_without_settlement(): void
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
            'transaction_id' => 'webxpay-unknown-payment-1',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $allocation = $payment->allocations()->create([
            'type' => PaymentAllocation::TYPE_CARD,
            'amount' => '800.00',
            'status' => PaymentAllocation::STATUS_RESERVED,
            'reference' => "payment:{$payment->id}:card",
            'reserved_at' => now(),
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-UNKNOWN-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $result = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-UNKNOWN-A01',
                'provider_reference' => 'WXP-UNKNOWN-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '416',
                'comment' => 'No response from bank',
            ]
        );

        $replayed = app(
            WebxpayOutcomeProcessor::class
        )->process(
            attempt: $attempt,
            parsed: [
                'merchant_order_id' => 'PKU-UNKNOWN-A01',
                'provider_reference' => 'WXP-UNKNOWN-1',
                'transaction_time' => '2026-08-05 12:30:00',
                'gateway' => '46',
                'status_code' => '416',
                'comment' => 'No response from bank',
            ]
        );

        $this->assertSame(
            $result->id,
            $replayed->id
        );

        $this->assertSame(
            1,
            $payment->events()
                ->where('event_type', 'PAYMENT_UNKNOWN')
                ->count()
        );

        $this->assertSame(
            'UNKNOWN',
            $result->payment_status
        );

        $attempt->refresh();

        $this->assertSame(
            'UNKNOWN',
            $attempt->status
        );
        $this->assertSame(
            'WXP-UNKNOWN-1',
            $attempt->gateway_reference
        );
        $this->assertSame(
            '416',
            $attempt->provider_status
        );
        $this->assertSame(
            'No response from bank',
            $attempt->failure_reason
        );
        $this->assertNotNull(
            $attempt->completed_at
        );

        $allocation->refresh();

        $this->assertSame(
            PaymentAllocation::STATUS_RESERVED,
            $allocation->status
        );
        $this->assertNull(
            $allocation->completed_at
        );
        $this->assertNull(
            $allocation->released_at
        );

        $this->assertSame(
            0,
            JournalEntry::query()->count()
        );

        $this->assertLedgerBalances();
    }
}
