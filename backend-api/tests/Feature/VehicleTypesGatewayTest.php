<?php

namespace Tests\Feature;

use App\Models\FareConfig;
use App\Models\User;
use App\Models\VehicleType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class VehicleTypesGatewayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $user = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'Person',
            'email' => 'vehicle-types-passenger@example.com',
            'phone' => '94771111111',
            'phone_normalized' => '94771111111',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        Sanctum::actingAs($user, ['role:passenger']);
    }

    public function test_available_only_returns_vehicle_types_with_active_fares(): void
    {
        VehicleType::create([
            'name' => 'car',
            'display_name' => 'Car',
            'is_active' => true,
        ]);
        VehicleType::create([
            'name' => 'van',
            'display_name' => 'Van',
            'is_active' => true,
        ]);

        FareConfig::create([
            'vehicle_type' => 'car',
            'base_fare' => 100,
            'per_km_rate' => 50,
            'per_minute_rate' => 10,
            'is_active' => true,
        ]);

        $this->getJson('/api/vehicle-types?active_only=1&available_only=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'car')
            ->assertJsonPath('data.0.fare_config.vehicle_type', 'car');
    }
}
