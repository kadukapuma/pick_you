<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\PaymentEvent;
use App\Services\Payments\MockPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class PaymentAttemptHistoryTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_failed_card_payment_can_be_retried_successfully(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $card = $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_DECLINED
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            2000,
            'card'
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        // First request: the mock gateway declines the saved card.
        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'attempt-failure-1']
        )->assertStatus(402);

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame('FAILED', $payment->payment_status);
        $this->assertSame(1, $payment->attempts()->count());

        $firstAttempt = $payment->attempts()
            ->where('attempt_number', 1)
            ->sole();

        $this->assertSame('FAILED', $firstAttempt->status);

        // Change the mock card scenario so the retry succeeds.
        $card->update([
            'last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4),
        ]);

        // A new idempotency key represents a deliberate retry.
        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'attempt-success-2']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment->refresh();

        $this->assertSame('COMPLETED', $payment->payment_status);
        $this->assertSame(1, Payment::where('ride_id', $ride->id)->count());
        $this->assertSame(2, $payment->attempts()->count());

        $attempts = PaymentAttempt::where('payment_id', $payment->id)
            ->orderBy('attempt_number')
            ->get();

        $this->assertSame(1, $attempts[0]->attempt_number);
        $this->assertSame('FAILED', $attempts[0]->status);

        $this->assertSame(2, $attempts[1]->attempt_number);
        $this->assertSame('COMPLETED', $attempts[1]->status);

        $this->assertNotSame(
            $attempts[0]->merchant_order_id,
            $attempts[1]->merchant_order_id
        );

        $this->assertSame(
            [
                'ATTEMPT_CREATED',
                'PAYMENT_FAILED',
                'ATTEMPT_CREATED',
                'PAYMENT_COMPLETED',
            ],
            PaymentEvent::where('payment_id', $payment->id)
                ->orderBy('id')
                ->pluck('event_type')
                ->all()
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_same_idempotency_key_does_not_create_another_attempt(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_DECLINED
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            2000,
            'card'
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $firstResponse = $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'same-attempt-key']
        )->assertStatus(402);

        $secondResponse = $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'same-attempt-key']
        )->assertStatus(402);

        $this->assertSame(
            $firstResponse->json(),
            $secondResponse->json()
        );

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(1, Payment::where('ride_id', $ride->id)->count());
        $this->assertSame(1, $payment->attempts()->count());
        $this->assertSame(2, $payment->events()->count());

        $this->assertSame(
            ['ATTEMPT_CREATED', 'PAYMENT_FAILED'],
            $payment->events()
                ->orderBy('id')
                ->pluck('event_type')
                ->all()
        );

        $this->assertSame(
            0,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );
    }

    public function test_completed_payment_cannot_be_captured_again(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_SUCCESS
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            2000,
            'card'
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'completed-first-request']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'completed-second-request']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED')
            ->assertJsonPath('message', 'Payment already processed.');

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(1, Payment::where('ride_id', $ride->id)->count());
        $this->assertSame(1, $payment->attempts()->count());
        $this->assertSame(2, $payment->events()->count());

        $this->assertSame(
            ['ATTEMPT_CREATED', 'PAYMENT_COMPLETED'],
            $payment->events()
                ->orderBy('id')
                ->pluck('event_type')
                ->all()
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }
}
