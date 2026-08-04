<?php

namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Ride;
use App\Models\User;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

/**
 * Per-vehicle-type commission, settable from the admin Fare Configs screen.
 * CommissionService::rateFor() already reads fare_configs.commission_rate as
 * the second step in its resolution order (driver override -> vehicle type ->
 * global setting -> config default) - this locks in the admin-facing half.
 */
class FareConfigCommissionRateTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function actingAsSuperAdmin(): User
    {
        $admin = $this->makeUser(User::ROLE_SUPER_ADMIN, '0770000002');
        $admin->ensureRole(User::ROLE_SUPER_ADMIN);

        Sanctum::actingAs($admin, ['role:super_admin']);

        return $admin;
    }

    public function test_admin_can_set_a_per_vehicle_type_commission_rate(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/fare-configs', [
            'vehicle_type' => 'tuk',
            'base_fare' => 50,
            'per_km_rate' => 80,
            'per_minute_rate' => 5,
            'cancellation_fee' => 30,
            'is_active' => true,
            'commission_rate' => 0.08,
        ])->assertCreated();

        $response->assertJsonPath('data.commission_rate', 0.08);

        $this->assertDatabaseHas('fare_configs', [
            'vehicle_type' => 'tuk',
            'commission_rate' => 0.08,
        ]);
    }

    public function test_commission_rate_is_optional_and_defaults_to_null(): void
    {
        $this->actingAsSuperAdmin();

        $response = $this->postJson('/api/fare-configs', [
            'vehicle_type' => 'car',
            'base_fare' => 50,
            'per_km_rate' => 80,
            'per_minute_rate' => 5,
            'cancellation_fee' => 30,
        ])->assertCreated();

        $this->assertNull($response->json('data.commission_rate'));
    }

    public function test_clearing_the_field_on_update_reverts_to_the_global_default(): void
    {
        $this->actingAsSuperAdmin();
        $fare = $this->makeFareConfig(['commission_rate' => 0.10]);

        $this->putJson("/api/fare-configs/{$fare->id}", [
            'vehicle_type' => $fare->vehicle_type,
            'base_fare' => $fare->base_fare,
            'per_km_rate' => $fare->per_km_rate,
            'per_minute_rate' => $fare->per_minute_rate,
            'cancellation_fee' => $fare->cancellation_fee,
            'commission_rate' => null,
        ])->assertOk()
            ->assertJsonPath('data.commission_rate', null);

        $this->assertDatabaseHas('fare_configs', [
            'id' => $fare->id,
            'commission_rate' => null,
        ]);
    }

    #[DataProvider('invalidRateProvider')]
    public function test_out_of_range_commission_rate_is_rejected(mixed $rate): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/fare-configs', [
            'vehicle_type' => 'van',
            'base_fare' => 50,
            'per_km_rate' => 80,
            'per_minute_rate' => 5,
            'cancellation_fee' => 30,
            'commission_rate' => $rate,
        ])->assertStatus(422);
    }

    public static function invalidRateProvider(): array
    {
        return [
            'negative' => [-0.01],
            'over 100%' => [1.5],
            'not a number' => ['six percent'],
        ];
    }

    /**
     * The end-to-end point of exposing this in the admin panel: a vehicle
     * type's override actually changes what settles on the ledger.
     */
    public function test_vehicle_type_rate_overrides_the_global_default_at_settlement(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(['vehicle_type' => 'premium', 'commission_rate' => 0.10]);

        $ride = Ride::create([
            'ride_code' => uniqid('RIDE'),
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'fare_id' => $fare->id,
            'pickup_address' => 'Pickup',
            'drop_address' => 'Drop',
            'distance_km' => 5,
            'estimated_fare' => 1000,
            'final_fare' => 1000,
            'payment_method' => 'cash',
            'status' => 'COMPLETED',
            'completed_at' => now(),
        ]);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'cash',
            'amount' => 1000,
            'transaction_id' => 'txn_'.uniqid(),
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
        ]);

        app(RideSettlementService::class)->settle($payment);

        // 10% override, not the 6% global default.
        $this->assertSame('100.00', $ride->fresh()->commission_amount);
        $this->assertSame('-100.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }
}
