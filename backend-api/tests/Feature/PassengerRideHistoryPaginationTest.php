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

class PassengerRideHistoryPaginationTest extends TestCase
{
    use RefreshDatabase;

    public function test_passenger_ride_history_returns_paginated_activities(): void
    {
        [$passengerUser, $passenger] = $this->passenger('0771111111');
        [, $otherPassenger] = $this->passenger('0772222222');
        [, $driver] = $this->driver();
        $fare = $this->fare();

        $oldestRide = $this->ride($passenger, $driver, $fare, RideStateMachine::COMPLETED, now()->subMinutes(30));
        $this->ride($passenger, $driver, $fare, RideStateMachine::COMPLETED, now()->subMinutes(20));
        $this->ride($passenger, $driver, $fare, RideStateMachine::COMPLETED, now()->subMinutes(10));
        $this->ride($passenger, $driver, $fare, RideStateMachine::CANCELLED, now()->subMinutes(5));
        $this->ride($otherPassenger, $driver, $fare, RideStateMachine::COMPLETED, now());

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->getJson('/api/rides?status=COMPLETED&page=2&per_page=2')
            ->assertOk()
            ->assertJsonPath('data.current_page', 2)
            ->assertJsonPath('data.per_page', 2)
            ->assertJsonPath('data.last_page', 2)
            ->assertJsonPath('data.total', 3)
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('data.data.0.id', $oldestRide->id);
    }

    private function passenger(string $phone): array
    {
        $user = $this->user(User::ROLE_PASSENGER, $phone);
        $passenger = $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        return [$user, $passenger];
    }

    private function driver(): array
    {
        $user = $this->user(User::ROLE_DRIVER, '0773333333');
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
            'completed_at' => $status === RideStateMachine::COMPLETED ? $updatedAt : null,
            'cancelled_at' => $status === RideStateMachine::CANCELLED ? $updatedAt : null,
        ]);

        $ride->forceFill(['updated_at' => $updatedAt])->save();

        return $ride;
    }
}
