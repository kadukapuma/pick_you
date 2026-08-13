<?php

namespace Tests\Feature;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Services\Ledger\LedgerService;
use App\Services\Payments\MockPaymentGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class CardPaymentSettlementTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    public function test_card_ride_captures_and_credits_the_driver(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-success-1'])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED')
            ->assertJsonPath('data.gateway', 'mock');

        $this->assertSame('1880.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertLedgerBalances();
    }

    public function test_declined_card_fails_without_touching_the_ledger(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger, MockPaymentGateway::CARD_DECLINED);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-declined'])
            ->assertStatus(402);

        $this->assertSame('DECLINED', Payment::where('ride_id', $ride->id)->first()->payment_status);
        // The driver must not be credited for money that was never collected.
        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame(0, JournalEntry::count());
    }

    public function test_card_ride_without_a_saved_card_is_rejected(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-nocard'])
            ->assertStatus(422);

        $this->assertSame(0, JournalEntry::count());
    }

    /**
     * The integrity fix: a driver confirming "cash" on a card ride would
     * otherwise be debited commission while the gateway also charges the
     * passenger.
     */
    public function test_payment_method_comes_from_the_ride_not_the_request(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            ['payment_method' => 'cash'],
            ['Idempotency-Key' => 'card-spoof'],
        )->assertOk();

        $payment = Payment::where('ride_id', $ride->id)->first();

        $this->assertSame('card', $payment->payment_method);
        // Credited 94%, not debited 6% as a spoofed cash confirmation would have.
        $this->assertSame('1880.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_cash_ride_settles_immediately_without_a_gateway(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'cash-settle-1'])
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertNull(Payment::where('ride_id', $ride->id)->first()->gateway);
        $this->assertLedgerBalances();
    }

    public function test_repeated_payment_requests_do_not_double_charge(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'duplicate-1'])->assertOk();
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'duplicate-2'])->assertOk();

        $this->assertSame(1, Payment::where('ride_id', $ride->id)->count());
        $this->assertSame(1, JournalEntry::count());
        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_driver_ride_requests_expose_the_payment_method(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();

        $vehicleType = \App\Models\VehicleType::create([
            'name' => $fare->vehicle_type,
            'display_name' => 'Test Car',
        ]);
        $driver->vehicles()->create([
            'vehicle_type_id' => $vehicleType->id,
            'is_active' => true,
            'vehicle_number' => 'ABC-1234',
            'brand' => 'Toyota',
            'model' => 'Axio',
            'color' => 'White',
            'year' => 2020,
            'seat_capacity' => 4,
        ]);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card', [
            'status' => 'REQUESTED',
            'driver_id' => null,
        ]);

        $redis = $this->mock(\App\Services\RideMatching\RideMatchingRedis::class);
        $redis->shouldReceive('currentRideIdsForDriver')->andReturn([$ride->id]);
        $redis->shouldReceive('getCurrentDriver')->andReturn((int) $driver->id);

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->getJson('/api/driver/ride-requests')
            ->assertOk()
            ->assertJsonPath('data.0.payment_method', 'card');
    }

    public function test_driver_over_the_credit_limit_cannot_accept_rides(): void
    {
        [, $driver] = $this->makeDriver();

        DriverAccount::forDriver((int) $driver->id)->update(['credit_limit' => '-100']);

        app(LedgerService::class)->post(
            JournalEntry::TYPE_ADJUSTMENT,
            'test:debt',
            'Accrued cash commission',
            [
                ['account' => "DRIVER:{$driver->id}", 'debit' => '150.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '150.00'],
            ],
        );

        $account = DriverAccount::forDriver((int) $driver->id)->refresh();

        $this->assertSame('-150.00', $account->balance());
        $this->assertTrue($account->isOverCreditLimit());
        $this->assertFalse($account->canAcceptRides());
    }

    public function test_driver_account_endpoint_reports_the_position(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'account-1'])->assertOk();

        $this->getJson('/api/driver/account')
            ->assertOk()
            ->assertJsonPath('data.balance', '-60.00')
            ->assertJsonPath('data.status', 'OWING')
            ->assertJsonPath('data.can_accept_rides', true);

        $this->getJson('/api/driver/earnings/summary?period=day')
            ->assertOk()
            ->assertJsonPath('data.gross', '1000.00')
            ->assertJsonPath('data.commission', '60.00')
            ->assertJsonPath('data.net', '940.00')
            ->assertJsonPath('data.cash_collected', '1000.00');
    }
}
