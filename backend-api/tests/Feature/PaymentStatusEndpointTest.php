<?php

namespace Tests\Feature;

use App\Services\Payments\MockPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class PaymentStatusEndpointTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_passenger_can_view_trusted_payment_status_with_newest_attempt_first(): void
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

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'status-declined-request']
        )->assertStatus(402);

        $card->update([
            'last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4),
        ]);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'status-success-request']
        )->assertOk();

        $this->getJson("/api/rides/{$ride->id}/payment")
            ->assertOk()
            ->assertJsonPath('data.ride_id', $ride->id)
            ->assertJsonPath('data.payment_method', 'card')
            ->assertJsonPath('data.payment.payment_status', 'COMPLETED')
            ->assertJsonCount(2, 'data.payment.attempts')
            ->assertJsonPath(
                'data.payment.attempts.0.attempt_number',
                2
            )
            ->assertJsonPath(
                'data.payment.attempts.0.status',
                'COMPLETED'
            )
            ->assertJsonPath(
                'data.payment.attempts.1.attempt_number',
                1
            )
            ->assertJsonPath(
                'data.payment.attempts.1.status',
                'DECLINED'
            );
    }

    public function test_passenger_can_view_a_ride_that_has_no_payment_yet(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            2000,
            'card'
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->getJson("/api/rides/{$ride->id}/payment")
            ->assertOk()
            ->assertJsonPath('data.ride_id', $ride->id)
            ->assertJsonPath('data.payment_method', 'card')
            ->assertJsonPath('data.payment', null);
    }

    public function test_another_passenger_cannot_view_the_payment(): void
    {
        [, $ownerPassenger] = $this->makePassenger();
        [$otherUser] = $this->makePassenger('0771234568');
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $ownerPassenger,
            $driver,
            $fare,
            2000,
            'card'
        );

        Sanctum::actingAs($otherUser, ['role:passenger']);

        $this->getJson("/api/rides/{$ride->id}/payment")
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'You are not authorized to view this payment.'
            );
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/rides/999/payment')
            ->assertUnauthorized();
    }
}
