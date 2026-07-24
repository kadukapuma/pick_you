<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\FareConfig;
use App\Models\Passenger;
use App\Models\Ride;
use App\Models\User;
use App\Services\Rides\RideStateMachine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverRideHistoryPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_ride_history_returns_only_assigned_paginated_rides(): void
    {
        [$driverUser, $driver] = $this->driver('0771111111');
        [, $otherDriver] = $this->driver('0772222222');
        [, $passenger] = $this->passenger();
        $fare = $this->fare();

        $oldestRide = $this->ride($passenger, $driver, $fare, RideStateMachine::COMPLETED, now()->subMinutes(30));
        $this->ride($passenger, $driver, $fare, RideStateMachine::CANCELLED, now()->subMinutes(20));
        $this->ride($passenger, $driver, $fare, RideStateMachine::STARTED, now()->subMinutes(10));
        $this->ride($passenger, $otherDriver, $fare, RideStateMachine::COMPLETED, now());

        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->getJson('/api/driver/rides?page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.total', 3)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $oldestRide->id);
    }

    public function test_driver_ride_history_ongoing_filter_returns_active_statuses_only(): void
    {
        [$driverUser, $driver] = $this->driver('0773333333');
        [, $passenger] = $this->passenger();
        $fare = $this->fare();

        $accepted = $this->ride($passenger, $driver, $fare, RideStateMachine::ACCEPTED, now()->subMinutes(30));
        $arrived = $this->ride($passenger, $driver, $fare, RideStateMachine::ARRIVED, now()->subMinutes(20));
        $started = $this->ride($passenger, $driver, $fare, RideStateMachine::STARTED, now()->subMinutes(10));
        $this->ride($passenger, $driver, $fare, RideStateMachine::COMPLETED, now()->subMinutes(5));
        $this->ride($passenger, $driver, $fare, RideStateMachine::CANCELLED, now());

        Sanctum::actingAs($driverUser, ['role:driver']);

        $response = $this->getJson('/api/driver/rides?status=ongoing')
            ->assertOk()
            ->assertJsonPath('data.total', 3);

        $this->assertSame(
            [$started->id, $arrived->id, $accepted->id],
            array_column($response->json('data.data'), 'id'),
        );
    }

    public function test_passenger_cannot_access_driver_ride_history(): void
    {
        [$passengerUser] = $this->passenger();

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->getJson('/api/driver/rides')->assertForbidden();
    }

    private function passenger(string $phone = '0774444444'): array
    {
        $user = $this->user(User::ROLE_PASSENGER, $phone);
        $passenger = $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        return [$user, $passenger];
    }

    private function driver(string $phone): array
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

    private function fare(): FareConfig
    {
        return FareConfig::create([
            'vehicle_type' => 'Car',
            'base_fare' => 100,
            'per_km_rate' => 10,
            'is_active' => true,
        ]);
    }

    private function ride(Passenger $passenger, Driver $driver, FareConfig $fare, string $status, \DateTimeInterface $updatedAt): Ride
    {
        $ride = Ride::create([
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
            'requested_at' => $updatedAt,
            'accepted_at' => in_array($status, [
                RideStateMachine::ACCEPTED,
                RideStateMachine::ARRIVED,
                RideStateMachine::STARTED,
                RideStateMachine::COMPLETED,
            ], true) ? $updatedAt : null,
            'arrived_at' => in_array($status, [
                RideStateMachine::ARRIVED,
                RideStateMachine::STARTED,
                RideStateMachine::COMPLETED,
            ], true) ? $updatedAt : null,
            'started_at' => in_array($status, [
                RideStateMachine::STARTED,
                RideStateMachine::COMPLETED,
            ], true) ? $updatedAt : null,
            'completed_at' => $status === RideStateMachine::COMPLETED ? $updatedAt : null,
            'cancelled_at' => $status === RideStateMachine::CANCELLED ? $updatedAt : null,
            'cancel_reason' => $status === RideStateMachine::CANCELLED ? 'Passenger cancelled' : null,
            'cancelled_by' => $status === RideStateMachine::CANCELLED ? 'passenger' : null,
        ]);

        $ride->forceFill(['updated_at' => $updatedAt])->save();

        return $ride;
    }
}
