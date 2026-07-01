<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\FareConfig;
use App\Models\Passenger;
use App\Models\Rating;
use App\Models\Ride;
use App\Models\User;
use App\Services\Rides\RideStateMachine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RatingSubmissionTest extends TestCase
{
    use RefreshDatabase;

    public function test_passenger_can_rate_completed_ride_and_driver_average_is_updated(): void
    {
        [$passengerUser, $passenger] = $this->passenger();
        [, $driver] = $this->driver();
        $ride = $this->ride($passenger, $driver, RideStateMachine::COMPLETED);

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 5,
            'review' => 'Great trip',
        ])->assertCreated()
            ->assertJsonPath('data.rating.ride_id', $ride->id)
            ->assertJsonPath('data.driver_rating', 5);

        $this->assertDatabaseHas('ratings', [
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'rating' => 5,
            'review' => 'Great trip',
        ]);
        $this->assertEqualsWithDelta(5.0, (float) $driver->fresh()->rating, 0.001);
    }

    public function test_driver_rating_is_average_across_all_driver_ratings(): void
    {
        [$firstPassengerUser, $firstPassenger] = $this->passenger('0771111111');
        [, $secondPassenger] = $this->passenger('0772222222');
        [, $driver] = $this->driver();
        $firstRide = $this->ride($firstPassenger, $driver, RideStateMachine::COMPLETED);
        $secondRide = $this->ride($secondPassenger, $driver, RideStateMachine::COMPLETED);
        Rating::create([
            'ride_id' => $secondRide->id,
            'passenger_id' => $secondPassenger->id,
            'driver_id' => $driver->id,
            'rating' => 3,
        ]);

        Sanctum::actingAs($firstPassengerUser, ['role:passenger']);

        $this->postJson('/api/ratings', [
            'ride_id' => $firstRide->id,
            'rating' => 5,
        ])->assertCreated()
            ->assertJsonPath('data.driver_rating', 4);

        $this->assertEqualsWithDelta(4.0, (float) $driver->fresh()->rating, 0.001);
    }

    public function test_repeated_rating_for_same_ride_updates_existing_row(): void
    {
        [$passengerUser, $passenger] = $this->passenger();
        [, $driver] = $this->driver();
        $ride = $this->ride($passenger, $driver, RideStateMachine::COMPLETED);

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 2,
            'review' => 'First review',
        ])->assertCreated();

        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 4,
            'review' => 'Updated review',
        ])->assertCreated()
            ->assertJsonPath('data.driver_rating', 4);

        $this->assertSame(1, Rating::where('ride_id', $ride->id)->count());
        $this->assertDatabaseHas('ratings', [
            'ride_id' => $ride->id,
            'rating' => 4,
            'review' => 'Updated review',
        ]);
        $this->assertEqualsWithDelta(4.0, (float) $driver->fresh()->rating, 0.001);
    }

    public function test_passenger_cannot_rate_another_passengers_ride(): void
    {
        [$actingUser] = $this->passenger('0771111111');
        [, $rideOwner] = $this->passenger('0772222222');
        [, $driver] = $this->driver();
        $ride = $this->ride($rideOwner, $driver, RideStateMachine::COMPLETED);

        Sanctum::actingAs($actingUser, ['role:passenger']);

        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 5,
        ])->assertForbidden();
    }

    public function test_incomplete_ride_cannot_be_rated(): void
    {
        [$passengerUser, $passenger] = $this->passenger();
        [, $driver] = $this->driver();
        $ride = $this->ride($passenger, $driver, RideStateMachine::STARTED);

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 5,
        ])->assertUnprocessable();
    }

    public function test_driver_profile_returns_updated_average_rating_and_completed_trip_count(): void
    {
        [$passengerUser, $passenger] = $this->passenger();
        [$driverUser, $driver] = $this->driver();
        $ride = $this->ride($passenger, $driver, RideStateMachine::COMPLETED);

        Sanctum::actingAs($passengerUser, ['role:passenger']);
        $this->postJson('/api/ratings', [
            'ride_id' => $ride->id,
            'rating' => 5,
        ])->assertCreated();

        Sanctum::actingAs($driverUser, ['role:driver']);
        $response = $this->getJson('/api/driver/profile')
            ->assertOk()
            ->assertJsonPath('data.trips', 1);

        $this->assertEqualsWithDelta(5.0, (float) $response->json('data.rating'), 0.001);
    }

    private function passenger(string $phone = '0771234567'): array
    {
        $user = $this->user(User::ROLE_PASSENGER, $phone);
        $passenger = $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        return [$user, $passenger];
    }

    private function driver(string $phone = '0777654321'): array
    {
        $user = $this->user(User::ROLE_DRIVER, $phone);
        $driver = $user->driver()->create(['status' => 'approved', 'availability' => 0, 'rating' => 0]);
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

    private function ride(Passenger $passenger, Driver $driver, string $status): Ride
    {
        $fare = FareConfig::create([
            'vehicle_type' => 'Car',
            'base_fare' => 100,
            'per_km_rate' => 10,
            'is_active' => true,
        ]);

        return Ride::create([
            'ride_code' => uniqid('RIDE'),
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'fare_id' => $fare->id,
            'pickup_address' => 'Pickup',
            'drop_address' => 'Drop',
            'distance_km' => 1,
            'estimated_fare' => 110,
            'final_fare' => 110,
            'status' => $status,
            'requested_at' => now(),
            'completed_at' => $status === RideStateMachine::COMPLETED ? now() : null,
        ]);
    }
}
