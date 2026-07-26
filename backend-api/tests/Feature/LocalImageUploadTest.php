<?php

namespace Tests\Feature;

use App\Models\Driver;
use App\Models\Passenger;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LocalImageUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        config(['app.url' => 'https://picku.lk']);
    }

    public function test_user_profile_picture_is_stored_locally_and_returns_an_absolute_url(): void
    {
        $user = $this->createUser(User::ROLE_DRIVER);
        Storage::disk('public')->put('users/'.$user->id.'/profiles/old.jpg', 'old');
        $user->update(['profile_picture_path' => '/storage/users/'.$user->id.'/profiles/old.jpg']);
        Sanctum::actingAs($user, ['role:driver']);

        $response = $this->post('/api/user/profile-picture', [
            'profile_picture' => UploadedFile::fake()->image('profile.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('data.profile_picture_path', fn ($value) => is_string($value)
                && str_starts_with($value, 'https://picku.lk/storage/users/'.$user->id.'/profiles/profile-'));

        $storedPath = $user->fresh()->profile_picture_path;
        $this->assertLocalFileExists($storedPath);
        Storage::disk('public')->assertMissing('users/'.$user->id.'/profiles/old.jpg');
    }

    public function test_passenger_profile_picture_is_stored_locally(): void
    {
        $user = $this->createUser(User::ROLE_PASSENGER);
        Passenger::create(['user_id' => $user->id]);
        Sanctum::actingAs($user, ['role:passenger']);

        $response = $this->post('/api/passenger/profile-picture', [
            'profile_picture' => UploadedFile::fake()->image('passenger.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $storedPath = $user->fresh()->profile_picture_path;
        $this->assertStringStartsWith('/storage/users/'.$user->id.'/profiles/passenger-profile-', $storedPath);
        $this->assertLocalFileExists($storedPath);
    }

    public function test_driver_licence_images_are_stored_locally(): void
    {
        $user = $this->createUser(User::ROLE_DRIVER);
        $driver = Driver::create(['user_id' => $user->id]);
        Sanctum::actingAs($user, ['role:driver']);

        $response = $this->post('/api/driver/license-images', [
            'license_front' => UploadedFile::fake()->image('front.jpg'),
            'license_back' => UploadedFile::fake()->image('back.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $driver->refresh();
        $this->assertLocalFileExists($driver->license_front_path);
        $this->assertLocalFileExists($driver->license_back_path);
    }

    public function test_vehicle_images_are_stored_locally(): void
    {
        $user = $this->createUser(User::ROLE_DRIVER);
        $driver = Driver::create(['user_id' => $user->id]);
        $vehicle = Vehicle::create([
            'driver_id' => $driver->id,
            'vehicle_number' => 'TEST-1001',
            'brand' => 'Test',
            'model' => 'Car',
            'color' => 'Black',
            'year' => 2025,
            'seat_capacity' => 4,
        ]);
        Sanctum::actingAs($user, ['role:driver']);

        $response = $this->post('/api/vehicles/'.$vehicle->id.'/upload-images', [
            'insurance_img' => UploadedFile::fake()->image('insurance.jpg'),
            'licence_img' => UploadedFile::fake()->image('registration.jpg'),
            'v_front' => UploadedFile::fake()->image('front.jpg'),
            'v_back' => UploadedFile::fake()->image('back.jpg'),
            'v_side' => UploadedFile::fake()->image('side.jpg'),
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $images = VehicleImage::query()->where('vehicle_id', $vehicle->id)->firstOrFail();

        foreach (['insurance_img', 'licence_img', 'v_front', 'v_back', 'v_side'] as $field) {
            $this->assertLocalFileExists($images->{$field});
        }
    }

    private function createUser(string $role): User
    {
        return User::create([
            'first_name' => 'Test',
            'last_name' => ucfirst($role),
            'email' => $role.'-'.uniqid().'@example.com',
            'phone' => '94'.random_int(700000000, 799999999),
            'password' => 'password',
            'role' => $role,
            'is_active' => true,
            'is_verified' => true,
        ]);
    }

    private function assertLocalFileExists(string $publicPath): void
    {
        $this->assertStringStartsWith('/storage/', $publicPath);
        Storage::disk('public')->assertExists(substr($publicPath, strlen('/storage/')));
    }
}
