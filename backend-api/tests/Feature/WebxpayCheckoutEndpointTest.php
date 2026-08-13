<?php

namespace Tests\Feature;

use App\Models\Payment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class WebxpayCheckoutEndpointTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_unauthenticated_checkout_request_is_rejected(): void
    {
        $this->postJson(
            '/api/rides/999/payments/webxpay/checkout',
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-unauthenticated',
            ]
        )->assertUnauthorized();
    }

    public function test_checkout_is_rejected_when_webxpay_is_disabled(): void
    {
        config()->set([
            'payments.webxpay.enabled' => false,
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-disabled',
            ]
        )
            ->assertStatus(503)
            ->assertJsonPath(
                'message',
                'WEBXPAY checkout is currently unavailable.'
            );
    }

    public function test_passenger_cannot_create_checkout_for_another_passengers_ride(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [, $ridePassenger] = $this->makePassenger(
            '0771234567'
        );

        [$otherPassengerUser] = $this->makePassenger(
            '0771234568'
        );

        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $ridePassenger,
            $driver,
            $fare,
            800,
            'card'
        );

        Sanctum::actingAs(
            $otherPassengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-wrong-passenger',
            ]
        )
            ->assertForbidden()
            ->assertJsonPath(
                'message',
                'You are not authorized to create checkout for this ride.'
            );
    }

    public function test_checkout_is_rejected_for_a_non_card_ride(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'cash'
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-cash-ride',
            ]
        )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'WEBXPAY checkout requires a card ride.'
            );
    }

    public function test_checkout_is_rejected_until_the_ride_is_completed(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $ride->update([
            'status' => 'IN_PROGRESS',
            'completed_at' => null,
        ]);

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-incomplete-ride',
            ]
        )
            ->assertUnprocessable()
            ->assertJsonPath(
                'message',
                'Ride must be completed before checkout.'
            );
    }

    public function test_checkout_is_rejected_when_payment_is_already_completed(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'webxpay-completed-payment',
            'payment_status' => 'COMPLETED',
            'gateway' => 'webxpay',
            'gateway_reference' => 'WEBXPAY-COMPLETED-1',
            'paid_at' => now(),
        ]);

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-already-completed',
            ]
        )
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'Payment has already been completed.'
            );
    }

    public function test_checkout_is_rejected_while_an_attempt_is_unresolved(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
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
            'transaction_id' => 'webxpay-unresolved-payment',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-R1-P1-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
        ]);

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-unresolved',
            ]
        )
            ->assertStatus(409)
            ->assertJsonPath(
                'message',
                'A WEBXPAY payment attempt is already awaiting confirmation.'
            );
    }

    public function test_passenger_can_prepare_a_webxpay_checkout(): void
    {
        config()->set([
            'payments.webxpay.enabled' => true,
            'payments.webxpay.secret_key' => 'test-secret',
        ]);

        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $response = $this->postJson(
            "/api/rides/{$ride->id}/payments/webxpay/checkout",
            [],
            [
                'Idempotency-Key' => 'webxpay-checkout-success-1',
            ]
        )
            ->assertCreated()
            ->assertJsonPath('data.amount', '800.00')
            ->assertJsonPath('data.currency', 'LKR');

        $payment = Payment::query()
            ->where('ride_id', $ride->id)
            ->sole();

        $this->assertSame(
            'PENDING',
            $payment->payment_status
        );

        $attempt = $payment->attempts()->sole();

        $this->assertSame('webxpay', $attempt->gateway);
        $this->assertSame('PROCESSING', $attempt->status);
        $this->assertSame('800.00', $attempt->amount);
        $this->assertSame('LKR', $attempt->currency);
        $this->assertNotNull($attempt->expires_at);

        $checkoutUrl = $response->json('data.checkout_url');

        $this->assertIsString($checkoutUrl);
        $this->assertNotSame('', $checkoutUrl);
        $this->assertStringNotContainsString(
            'test-secret',
            $response->getContent()
        );
    }

    public function test_checkout_page_rejects_an_unsigned_url(): void
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
            'transaction_id' => 'webxpay-unsigned-page-payment',
            'payment_status' => 'PENDING',
            'gateway' => 'webxpay',
        ]);

        $attempt = $payment->attempts()->create([
            'attempt_number' => 1,
            'gateway' => 'webxpay',
            'merchant_order_id' => 'PKU-UNSIGNED-A01',
            'status' => 'PROCESSING',
            'amount' => '800.00',
            'currency' => 'LKR',
            'started_at' => now(),
            'expires_at' => now()->addMinutes(15),
        ]);

        $this->get(
            "/payments/webxpay/checkout/{$attempt->id}"
        )->assertForbidden();
    }
}
