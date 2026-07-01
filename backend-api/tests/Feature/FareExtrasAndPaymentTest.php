<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\FareConfig;
use App\Models\Passenger;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Services\Fares\FareCalculationService;
use App\Services\Locations\RideLocationPointProcessor;
use App\Services\Rides\RideStateMachine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FareExtrasAndPaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_estimate_includes_distance_and_duration(): void
    {
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);

        $estimate = app(FareCalculationService::class)->estimate(
            $fare,
            reportedDistanceKm: 2,
            estimatedDurationMinutes: 5,
            pickupLat: 6.9,
            pickupLng: 79.8,
            dropLat: 6.91,
            dropLng: 79.81,
        );

        $this->assertSame(2.0, $estimate['distance_km']);
        $this->assertSame(5.0, $estimate['duration_minutes']);
        $this->assertSame(300.0, $estimate['estimated_fare']);
    }

    public function test_trip_completion_adds_extra_km_and_chargeable_waiting_to_final_fare(): void
    {
        config(['ride.waiting_grace_minutes' => 5]);
        [$driverUser, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'estimated_fare' => 150,
            'distance_km' => 1,
            'estimated_distance_km' => 1,
            'arrived_at' => now()->subMinutes(15),
            'started_at' => now()->subMinutes(8),
        ]);

        DB::table('ride_location_points')->insert([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'latitude' => 6.90000000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(7),
            'sequence' => 1,
            'distance_from_previous_km' => 0,
            'accepted_for_fare' => true,
            'rejection_reason' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('ride_location_points')->insert([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'latitude' => 6.91800000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinute(),
            'sequence' => 2,
            'distance_from_previous_km' => 2,
            'accepted_for_fare' => true,
            'rejection_reason' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->assertSame(2, DB::table('ride_location_points')->where('ride_id', $ride->id)->count());
        $this->assertGreaterThan(
            1.9,
            app(FareCalculationService::class)->actualDistanceKm($ride->fresh(), 1)
        );

        Sanctum::actingAs($driverUser, ['role:driver']);
        $response = $this->postJson(
            "/api/rides/{$ride->id}/complete",
            [],
            ['Idempotency-Key' => 'complete-with-extras']
        )->assertOk();

        $completed = $ride->fresh();
        $this->assertSame(RideStateMachine::COMPLETED, $completed->status);
        $this->assertGreaterThan(0.9, (float) $completed->extra_distance_km);
        $this->assertEqualsWithDelta(2.0, (float) $completed->chargeable_waiting_minutes, 0.1);
        $this->assertEqualsWithDelta(
            (float) $completed->estimated_fare + (float) $completed->extra_distance_fare + (float) $completed->waiting_fare,
            (float) $completed->final_fare,
            0.1,
        );
        $this->assertEqualsWithDelta((float) $completed->final_fare, (float) $response->json('data.final_fare'), 0.1);
    }

    public function test_accepted_gps_points_update_audit_history_and_ride_distance(): void
    {
        [$driverUser, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'estimated_fare' => 150,
            'distance_km' => 1,
            'estimated_distance_km' => 1,
            'started_at' => now()->subMinutes(5),
        ]);
        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson('/api/driver-locations', [
            'ride_id' => $ride->id,
            'latitude' => 6.90000000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(4)->toIso8601String(),
            'sequence' => 100,
        ])->assertOk();

        $this->postJson('/api/driver-locations', [
            'ride_id' => $ride->id,
            'latitude' => 6.91800000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(3)->toIso8601String(),
            'sequence' => 101,
        ])->assertOk();

        $this->assertSame(2, DB::table('ride_location_points')->where('ride_id', $ride->id)->where('accepted_for_fare', true)->count());
        $this->assertGreaterThan(1.9, (float) $ride->fresh()->actual_distance_km);
        $this->assertSame(1, DB::table('driver_locations')->where('driver_id', $driver->id)->count());
        $this->assertSame($ride->id, DB::table('driver_locations')->where('driver_id', $driver->id)->value('ride_id'));
    }

    public function test_idle_driver_location_is_persisted_immediately_for_matching(): void
    {
        [$driverUser, $driver] = $this->driver();
        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->postJson('/api/driver-locations', [
            'latitude' => 6.90000000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 0,
            'heading' => 0,
            'recorded_at' => now()->subSecond()->toIso8601String(),
            'sequence' => 150,
        ])->assertOk();

        $this->assertDatabaseHas('driver_locations', [
            'driver_id' => $driver->id,
            'ride_id' => null,
        ]);
    }

    public function test_rejected_noisy_and_duplicate_points_do_not_affect_fare_distance(): void
    {
        [$driverUser, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'started_at' => now()->subMinutes(5),
        ]);
        Sanctum::actingAs($driverUser, ['role:driver']);

        $payload = [
            'ride_id' => $ride->id,
            'latitude' => 6.90000000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(4)->toIso8601String(),
            'sequence' => 200,
        ];

        $this->postJson('/api/driver-locations', $payload)->assertOk();
        $this->postJson('/api/driver-locations', $payload)->assertOk();

        $this->postJson('/api/driver-locations', [
            ...$payload,
            'latitude' => 6.90100000,
            'accuracy' => 300,
            'sequence' => 201,
        ])->assertOk();

        $this->assertSame(1, DB::table('ride_location_points')->where('ride_id', $ride->id)->where('accepted_for_fare', true)->count());
        $this->assertSame(1, DB::table('ride_location_points')->where('ride_id', $ride->id)->where('rejection_reason', 'poor_accuracy')->count());
        $this->assertEqualsWithDelta(0, (float) $ride->fresh()->actual_distance_km, 0.001);
    }

    public function test_final_fare_never_drops_below_estimate(): void
    {
        [$driverUser, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'estimated_fare' => 500,
            'distance_km' => 5,
            'estimated_distance_km' => 5,
            'arrived_at' => now()->subMinutes(4),
            'started_at' => now()->subMinutes(3),
        ]);

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson(
            "/api/rides/{$ride->id}/complete",
            [],
            ['Idempotency-Key' => 'complete-no-extras']
        )->assertOk();

        $this->assertEqualsWithDelta(0, (float) $ride->fresh()->extra_distance_fare, 0.001);
        $this->assertEqualsWithDelta(500, (float) $ride->fresh()->final_fare, 0.001);
    }

    public function test_payment_amount_uses_final_fare_and_duplicate_payment_is_not_recreated(): void
    {
        [$driverUser, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'estimated_fare' => 250,
            'final_fare' => 333,
        ]);
        $ride->update(['status' => RideStateMachine::COMPLETED]);

        Sanctum::actingAs($driverUser, ['role:driver']);
        $firstPayment = $this->postJson(
            "/api/payments/{$ride->id}",
            ['payment_method' => 'cash'],
            ['Idempotency-Key' => 'cash-payment-first']
        )
            ->assertOk()
            ->assertJsonPath('message', 'Payment processed successfully');

        $this->assertEqualsWithDelta(333, (float) $firstPayment->json('data.amount'), 0.001);

        $this->postJson(
            "/api/payments/{$ride->id}",
            ['payment_method' => 'cash'],
            ['Idempotency-Key' => 'cash-payment-second']
        )
            ->assertOk()
            ->assertJsonPath('message', 'Payment already processed.');

        $this->assertSame(1, Payment::where('ride_id', $ride->id)->count());
    }

    public function test_fare_replay_matches_live_processed_distance(): void
    {
        [, $driver] = $this->driver();
        [, $passenger] = $this->passenger();
        $fare = $this->fareConfig(base: 50, perKm: 100, perMinute: 10);
        $ride = $this->startedRide($passenger, $driver, $fare, [
            'started_at' => now()->subMinutes(5),
        ]);
        $processor = app(RideLocationPointProcessor::class);

        $processor->process([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'latitude' => 6.90000000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(4)->toIso8601String(),
            'sequence' => 300,
        ]);
        $processor->process([
            'ride_id' => $ride->id,
            'driver_id' => $driver->id,
            'latitude' => 6.91800000,
            'longitude' => 79.80000000,
            'accuracy' => 10,
            'speed' => 10,
            'heading' => 0,
            'recorded_at' => now()->subMinutes(3)->toIso8601String(),
            'sequence' => 301,
        ]);

        $replay = $processor->replay($ride->fresh());

        $this->assertEqualsWithDelta((float) $ride->fresh()->actual_distance_km, $replay['actual_distance_km'], 0.001);
        $this->assertEqualsWithDelta(0, $replay['distance_delta_km'], 0.001);
    }

    public function test_active_fare_config_for_same_vehicle_type_cannot_be_duplicated(): void
    {
        $admin = $this->user(User::ROLE_SUPER_ADMIN, '0770000001');
        $admin->ensureRole(User::ROLE_SUPER_ADMIN);
        Sanctum::actingAs($admin, ['role:super_admin']);

        $payload = [
            'vehicle_type' => 'car',
            'base_fare' => 100,
            'per_km_rate' => 80,
            'per_minute_rate' => 5,
            'cancellation_fee' => 50,
            'is_active' => true,
        ];

        $this->postJson('/api/fare-configs', $payload)->assertCreated();
        $this->postJson('/api/fare-configs', $payload)->assertUnprocessable();
    }

    private function passenger(string $phone = '0771234567'): array
    {
        $user = $this->user(User::ROLE_PASSENGER, $phone);
        $passenger = $user->passenger()->create(['wallet_balance' => 1000]);
        $user->ensureRole(User::ROLE_PASSENGER);

        return [$user, $passenger];
    }

    private function driver(string $phone = '0777654321'): array
    {
        $user = $this->user(User::ROLE_DRIVER, $phone);
        $driver = $user->driver()->create(['status' => 'approved', 'availability' => 1]);
        $user->ensureRole(User::ROLE_DRIVER);

        return [$user, $driver];
    }

    private function user(string $role, string $phone): User
    {
        return User::create([
            'first_name' => 'Test',
            'last_name' => 'Person',
            'email' => uniqid('', true).'@example.com',
            'phone' => $phone,
            'phone_normalized' => $phone,
            'password' => 'password',
            'role' => $role,
            'is_active' => true,
            'is_verified' => true,
        ]);
    }

    private function fareConfig(float $base, float $perKm, float $perMinute): FareConfig
    {
        return FareConfig::create([
            'vehicle_type' => uniqid('car'),
            'base_fare' => $base,
            'per_km_rate' => $perKm,
            'per_minute_rate' => $perMinute,
            'cancellation_fee' => 50,
            'is_active' => true,
        ]);
    }

    private function startedRide(Passenger $passenger, Driver $driver, FareConfig $fare, array $overrides = []): Ride
    {
        return Ride::create([
            'ride_code' => uniqid('RIDE'),
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'fare_id' => $fare->id,
            'pickup_address' => 'Pickup',
            'drop_address' => 'Drop',
            'distance_km' => 1,
            'estimated_distance_km' => 1,
            'estimated_duration_minutes' => 0,
            'estimated_fare' => 150,
            'final_fare' => 0,
            'status' => RideStateMachine::STARTED,
            'requested_at' => now()->subMinutes(30),
            'accepted_at' => now()->subMinutes(25),
            'arrived_at' => now()->subMinutes(15),
            'started_at' => now()->subMinutes(10),
            ...$overrides,
        ]);
    }
}
