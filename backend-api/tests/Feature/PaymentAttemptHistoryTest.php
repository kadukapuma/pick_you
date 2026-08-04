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

    public function test_declined_card_payment_can_be_retried_successfully(): void
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

        $this->assertSame('DECLINED', $payment->payment_status);
        $this->assertSame(1, $payment->attempts()->count());

        $firstAttempt = $payment->attempts()
            ->where('attempt_number', 1)
            ->sole();

        $this->assertSame('DECLINED', $firstAttempt->status);

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
        $this->assertSame('DECLINED', $attempts[0]->status);

        $this->assertSame(2, $attempts[1]->attempt_number);
        $this->assertSame('COMPLETED', $attempts[1]->status);

        $this->assertNotSame(
            $attempts[0]->merchant_order_id,
            $attempts[1]->merchant_order_id
        );

        $this->assertSame(
            [
                'ATTEMPT_CREATED',
                'PAYMENT_DECLINED',
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
            ['ATTEMPT_CREATED', 'PAYMENT_DECLINED'],
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

    public function test_pending_payment_does_not_settle_or_create_an_immediate_retry(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_PENDING
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
            ['Idempotency-Key' => 'pending-first-request']
        )
            ->assertStatus(202)
            ->assertJsonPath('data.payment_status', 'PENDING');

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(1, $payment->attempts()->count());
        $this->assertSame('PENDING', $payment->attempts()->sole()->status);

        // A different key must not create another charge while still pending.
        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'pending-second-request']
        )
            ->assertStatus(202)
            ->assertJsonPath('data.payment_status', 'PENDING');

        $payment->refresh();

        $this->assertSame(1, $payment->attempts()->count());

        $this->assertSame(
            ['ATTEMPT_CREATED', 'PAYMENT_PENDING'],
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

    public function test_unknown_payment_does_not_settle_or_allow_retry(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_UNKNOWN
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
            ['Idempotency-Key' => 'unknown-first-request']
        )
            ->assertStatus(202)
            ->assertJsonPath('data.payment_status', 'UNKNOWN');

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(1, $payment->attempts()->count());
        $this->assertSame('UNKNOWN', $payment->attempts()->sole()->status);

        // Even with a new key, UNKNOWN must not cause another charge.
        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'unknown-second-request']
        )
            ->assertStatus(202)
            ->assertJsonPath('data.payment_status', 'UNKNOWN');

        $payment->refresh();

        $this->assertSame(1, $payment->attempts()->count());

        $this->assertSame(
            ['ATTEMPT_CREATED', 'PAYMENT_UNKNOWN'],
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

    public function test_cancelled_payment_does_not_settle_but_can_be_restarted(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $card = $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_CANCELLED
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
            ['Idempotency-Key' => 'cancelled-first-request']
        )
            ->assertStatus(409);

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame('CANCELLED', $payment->payment_status);
        $this->assertSame(1, $payment->attempts()->count());
        $this->assertSame('CANCELLED', $payment->attempts()->sole()->status);

        $this->assertSame(
            0,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        // Simulate the passenger restarting with a successful card outcome.
        $card->update([
            'last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4),
        ]);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'cancelled-restart-request']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment->refresh();

        $this->assertSame(2, $payment->attempts()->count());

        $this->assertSame(
            ['CANCELLED', 'COMPLETED'],
            $payment->attempts()
                ->orderBy('attempt_number')
                ->pluck('status')
                ->all()
        );

        $this->assertSame(
            [
                'ATTEMPT_CREATED',
                'PAYMENT_CANCELLED',
                'ATTEMPT_CREATED',
                'PAYMENT_COMPLETED',
            ],
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

    public function test_definite_gateway_error_is_failed_and_can_be_retried(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $card = $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_ERROR
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
            ['Idempotency-Key' => 'technical-failure-request']
        )->assertStatus(402);

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame('FAILED', $payment->payment_status);
        $this->assertSame('FAILED', $payment->attempts()->sole()->status);

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

        $card->update([
            'last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4),
        ]);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'technical-retry-request']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment->refresh();

        $this->assertSame(2, $payment->attempts()->count());

        $this->assertSame(
            ['FAILED', 'COMPLETED'],
            $payment->attempts()
                ->orderBy('attempt_number')
                ->pluck('status')
                ->all()
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );
    }
}
