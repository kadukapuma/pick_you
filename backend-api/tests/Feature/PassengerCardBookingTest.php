<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Services\Payments\MockPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

/**
 * End to end, through the actual HTTP endpoints the apps call: a passenger
 * saves a card, a ride they booked as "card" completes, and confirming the
 * payment posts the same double-entry ledger the cash path posts - without
 * a real gateway behind it. This is the loop PassengerApp now drives via
 * paymentService.saveCard() and paymentService.beginRidePayment().
 */
class PassengerCardBookingTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_passenger_saves_a_card_over_the_api(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $response = $this->postJson('/api/payment-methods', [
            'number' => MockPaymentGateway::CARD_SUCCESS,
            'exp_month' => 12,
            'exp_year' => (int) now()->addYear()->year,
            'cvv' => '123',
            'brand' => 'visa',
        ])->assertCreated();

        // The PAN must never come back, and never reach the database either.
        $response->assertJsonMissingPath('data.token');
        $response->assertJsonMissingPath('data.number');
        $response->assertJsonPath('data.last4', substr(MockPaymentGateway::CARD_SUCCESS, -4));

        $this->assertDatabaseHas('passenger_payment_methods', [
            'passenger_id' => $passenger->id,
            'gateway' => MockPaymentGateway::NAME,
            'last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4),
        ]);

        $this->getJson('/api/payment-methods')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    /**
     * The mock only distinguishes success/decline/error at capture time, not
     * at tokenization - a real gateway would reject a doomed card immediately,
     * but the mock cannot know that from the number alone. What tokenization
     * does validate is basic shape.
     */
    public function test_card_with_too_few_digits_is_rejected_without_saving_it(): void
    {
        [$passengerUser] = $this->makePassenger();
        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson('/api/payment-methods', [
            'number' => '4111',
            'exp_month' => 12,
            'exp_year' => (int) now()->addYear()->year,
        ])->assertStatus(422);

        $this->assertDatabaseCount('passenger_payment_methods', 0);
    }

    /**
     * The scenario the passenger app actually drives: book as card, complete
     * the ride, then confirm payment from the passenger's side (mirroring
     * ride-tracking's redirect to /payments/processing). No driver action.
     */
    public function test_passenger_confirms_a_card_ride_and_the_ledger_balances(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard($passenger, MockPaymentGateway::CARD_SUCCESS);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000.00, 'card');

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $response = $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'passenger-card-1'])
            ->assertOk();

        $response->assertJsonPath('data.payment_status', 'COMPLETED');
        $response->assertJsonPath('data.payment_method', 'card');
        $response->assertJsonPath('data.gateway', MockPaymentGateway::NAME);

        // 6% commission: PickU keeps 120, owes the driver the remaining 1880.
        $this->assertSame('1880.00', app(\App\Services\Ledger\LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame('120.00', app(\App\Services\Ledger\LedgerService::class)->balanceFor('REVENUE_COMMISSION'));
        // Asset accounts are stored credit-positive too, so a 2000 debit reads
        // as -2000 in the raw balance (naturalBalance() flips it for display).
        $this->assertSame('-2000.00', app(\App\Services\Ledger\LedgerService::class)->balanceFor('GATEWAY_RECEIVABLE'));

        $this->assertLedgerBalances();

        $entry = JournalEntry::where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)->sole();
        $this->assertSame(MockPaymentGateway::NAME, $entry->gateway);
    }

    /** A declined card at confirmation time must not touch the ledger at all. */
    public function test_passenger_confirms_a_declined_card_and_nothing_settles(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard($passenger, MockPaymentGateway::CARD_DECLINED);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000.00, 'card');

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'passenger-card-declined'])
            ->assertStatus(402);

        $this->assertDatabaseMissing('journal_entries', ['type' => JournalEntry::TYPE_RIDE_SETTLEMENT]);
        $this->assertSame('0.00', app(\App\Services\Ledger\LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    /**
     * Whichever side confirms first wins; the other gets the same result back
     * instead of a second charge. This is what stops the driver's "Finish
     * Trip" tap and the passenger's payment-processing screen from double
     * settling the same ride.
     */
    public function test_driver_and_passenger_confirming_the_same_ride_settle_once(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [$driverUser, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $this->makeCard($passenger, MockPaymentGateway::CARD_SUCCESS);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000.00, 'card');

        Sanctum::actingAs($passengerUser, ['role:passenger']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'race-passenger'])
            ->assertOk();

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'race-driver'])
            ->assertOk()
            ->assertJsonPath('message', 'Payment already processed.');

        $this->assertSame('1', (string) \App\Models\Payment::where('ride_id', $ride->id)->count());
        $this->assertSame(
            1,
            JournalEntry::where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)->count(),
        );
        $this->assertLedgerBalances();
    }
}
