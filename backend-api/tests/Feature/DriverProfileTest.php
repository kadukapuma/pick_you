<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\DriverCredential;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DriverProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_can_update_personal_profile_details(): void
    {
        [$user, $driver] = $this->driver();
        $credential = DriverCredential::create([
            'driver_id' => $driver->id,
            'login_email' => 'old-driver@example.com',
            'password' => 'password',
        ]);

        Sanctum::actingAs($user, ['role:driver']);

        $this->putJson('/api/driver/profile', [
            'first_name' => 'New',
            'last_name' => 'Driver',
            'email' => 'new-driver@example.com',
            'phone' => '0771112223',
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'New Driver')
            ->assertJsonPath('data.email', 'new-driver@example.com')
            ->assertJsonPath('data.phone', '0771112223');

        $user->refresh();
        $credential->refresh();

        $this->assertSame('New', $user->first_name);
        $this->assertSame('Driver', $user->last_name);
        $this->assertSame('new-driver@example.com', $user->email);
        $this->assertSame('new-driver@example.com', $credential->login_email);
    }

    public function test_driver_profile_returns_real_document_statuses(): void
    {
        [$user, $driver] = $this->driver(['status' => 'pending']);
        $driver->update([
            'license_front_path' => '/storage/drivers/1/licenses/front.jpg',
            'license_back_path' => null,
        ]);
        $vehicle = Vehicle::create([
            'driver_id' => $driver->id,
            'vehicle_number' => 'WP-ABC-1234',
            'brand' => 'Toyota',
            'model' => 'Prius',
            'color' => 'White',
            'year' => 2020,
            'seat_capacity' => 4,
            'is_active' => true,
        ]);
        VehicleImage::create([
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'licence_img' => '/storage/drivers/1/vehicles/1/registration.jpg',
            'v_front' => '/storage/drivers/1/vehicles/1/front.jpg',
        ]);

        Sanctum::actingAs($user, ['role:driver']);

        $this->getJson('/api/driver/profile')
            ->assertOk()
            ->assertJsonPath('data.documents.licenseFront.status', 'pending')
            ->assertJsonPath('data.documents.licenseBack.status', 'not_set')
            ->assertJsonPath('data.documents.vehicleRegistration.status', 'pending')
            ->assertJsonPath('data.documents.vehicleFront.status', 'pending')
            ->assertJsonPath('data.documents.vehicleBack.status', 'not_set');
    }

    public function test_driver_can_update_bank_details(): void
    {
        [$user] = $this->driver();

        Sanctum::actingAs($user, ['role:driver']);

        $this->postJson('/api/driver/profile/update-bank', [
            'bank_name' => 'Commercial Bank',
            'branch' => 'Kandy',
            'account_name' => 'Test Driver',
            'account_number' => '1234567890',
        ])
            ->assertOk()
            ->assertJsonPath('data.bank.name', 'Commercial Bank')
            ->assertJsonPath('data.bank.branch', 'Kandy')
            ->assertJsonPath('data.bank.accountName', 'Test Driver')
            ->assertJsonPath('data.bank.accountNumber', '1234567890');
    }

    private function driver(array $overrides = []): array
    {
        $user = User::create([
            'first_name' => 'Test',
            'last_name' => 'Driver',
            'email' => uniqid('', true).'@example.com',
            'phone' => '0777654321',
            'phone_normalized' => '0777654321',
            'password' => 'password',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $driver = $user->driver()->create(array_merge([
            'status' => 'approved',
            'availability' => 0,
            'rating' => 0,
        ], $overrides));
        $user->ensureRole(User::ROLE_DRIVER);

        return [$user, $driver];
    }
}
