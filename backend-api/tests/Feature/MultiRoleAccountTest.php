<?php

namespace Tests\Feature;

use App\Models\DriverCredential;
use App\Models\OtpVerification;
use App\Models\PendingDriverEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MultiRoleAccountTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_enrollment_otp_uses_configured_notify_service(): void
    {
        config(['services.notifylk' => [
            'url' => 'https://notify.test/send',
            'user_id' => '12345',
            'api_key' => 'test-key',
            'sender_id' => 'PickYou',
        ]]);
        Http::fake(['https://notify.test/*' => Http::response(['status' => 'success'])]);

        $registration = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Driver', 'last_name' => 'Person',
            'email' => 'otp-driver@example.com', 'phone' => '0771234567',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertStatus(202);

        $this->postJson('/api/driver/auth/otp/send', [
            'enrollment_token' => $registration->json('data.enrollment_token'),
        ])->assertOk();

        Http::assertSent(fn ($request) => str_starts_with($request->url(), 'https://notify.test/send?')
            && $request['user_id'] === '12345'
            && $request['to'] === '94771234567');
    }

    public function test_existing_driver_becomes_a_passenger_after_passenger_otp_verification(): void
    {
        $user = $this->user(User::ROLE_DRIVER, '0771234567');
        $user->driver()->create(['status' => 'approved', 'availability' => 0]);
        $user->ensureRole(User::ROLE_DRIVER);
        OtpVerification::create([
            'contact' => '94771234567', 'purpose' => 'passenger_login',
            'otp_code' => '1234', 'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/passenger/auth/otp/verify', [
            'phone' => '0771234567', 'otp_code' => '1234',
        ])->assertOk()->assertJsonPath('data.active_role', User::ROLE_PASSENGER);

        $this->assertNotNull($response->json('data.token'));
        $this->assertDatabaseHas('user_roles', ['user_id' => $user->id, 'role' => 'passenger', 'is_active' => 1]);
        $this->assertDatabaseHas('passengers', ['user_id' => $user->id]);
        $this->assertSame(User::ROLE_DRIVER, $user->fresh()->role);
    }

    public function test_existing_passenger_can_complete_driver_enrollment_without_replacing_shared_credentials(): void
    {
        $user = $this->user(User::ROLE_PASSENGER, '94771234567');
        $user->update(['email' => 'passenger@example.com', 'password' => null]);
        $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);

        $registration = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Driver', 'last_name' => 'Person',
            'email' => 'driver-login@example.com', 'phone' => '0771234567',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertStatus(202);
        $token = $registration->json('data.enrollment_token');
        OtpVerification::create([
            'contact' => '94771234567', 'purpose' => 'driver_registration',
            'otp_code' => '4321', 'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $token, 'otp_code' => '4321',
        ])->assertCreated()->assertJsonPath('data.active_role', User::ROLE_DRIVER);

        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $token, 'otp_code' => '4321',
        ])->assertStatus(410);

        $this->assertSame('passenger@example.com', $user->fresh()->email);
        $this->assertDatabaseHas('drivers', ['user_id' => $user->id]);
        $credential = DriverCredential::whereHas('driver', fn ($query) => $query->where('user_id', $user->id))->firstOrFail();
        $this->assertSame('driver-login@example.com', $credential->login_email);
        $this->assertDatabaseHas('user_roles', ['user_id' => $user->id, 'role' => 'driver', 'is_active' => 1]);
    }

    public function test_scoped_tokens_cannot_cross_between_passenger_and_driver_routes(): void
    {
        $user = $this->user(User::ROLE_DRIVER, '94771234567');
        $user->passenger()->create(['wallet_balance' => 0]);
        $user->driver()->create(['status' => 'approved', 'availability' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);
        $user->ensureRole(User::ROLE_DRIVER);

        Sanctum::actingAs($user, ['role:driver']);
        $this->getJson('/api/passenger/profile')->assertForbidden();
        $this->postJson('/api/rides', [], ['Idempotency-Key' => 'driver-cannot-book'])->assertForbidden();

        Sanctum::actingAs($user, ['role:passenger']);
        $this->getJson('/api/driver/profile')->assertForbidden();
        $this->getJson('/api/passenger/profile')->assertOk();
        $this->postJson('/api/rides', [], ['Idempotency-Key' => 'passenger-can-reach-booking'])
            ->assertUnprocessable();
    }

    public function test_driver_suspension_does_not_disable_passenger_access(): void
    {
        $user = $this->user(User::ROLE_DRIVER, '94771234567');
        $user->passenger()->create(['wallet_balance' => 0]);
        $driver = $user->driver()->create(['status' => 'approved', 'availability' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);
        $user->ensureRole(User::ROLE_DRIVER);

        $user->ensureRole(User::ROLE_DRIVER, false);
        $driver->update(['status' => 'suspended']);
        Sanctum::actingAs($user, ['role:passenger']);

        $this->getJson('/api/passenger/profile')->assertOk();
        $this->assertTrue($user->fresh()->is_active);
    }

    public function test_expired_enrollment_and_global_ban_are_rejected(): void
    {
        $registration = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Driver', 'last_name' => 'Person',
            'email' => 'expired@example.com', 'phone' => '0771234567',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertStatus(202);
        PendingDriverEnrollment::query()->update(['expires_at' => now()->subSecond()]);
        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $registration->json('data.enrollment_token'),
            'otp_code' => '1234',
        ])->assertStatus(410);

        $user = $this->user(User::ROLE_PASSENGER, '0771234567');
        $user->passenger()->create(['wallet_balance' => 0]);
        $user->ensureRole(User::ROLE_PASSENGER);
        $user->update(['is_active' => false]);
        Sanctum::actingAs($user, ['role:passenger']);
        $this->getJson('/api/passenger/profile')->assertForbidden();
    }

    public function test_ambiguous_legacy_phone_identity_is_rejected(): void
    {
        foreach (['0771234567', '94771234567'] as $index => $phone) {
            User::create([
                'first_name' => 'Conflict', 'last_name' => (string) $index,
                'email' => "conflict{$index}@example.com", 'phone' => $phone,
                'phone_normalized' => null, 'password' => 'password',
                'role' => User::ROLE_DRIVER, 'is_active' => true, 'is_verified' => true,
            ]);
        }
        OtpVerification::create([
            'contact' => '94771234567', 'purpose' => 'passenger_login',
            'otp_code' => '1234', 'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/passenger/auth/otp/verify', [
            'phone' => '0771234567', 'otp_code' => '1234',
        ])->assertStatus(409);
    }

    public function test_driver_login_email_collision_is_rejected(): void
    {
        $user = $this->user(User::ROLE_DRIVER, '94771234567');
        $driver = $user->driver()->create(['status' => 'approved', 'availability' => 0]);
        DriverCredential::create([
            'driver_id' => $driver->id,
            'login_email' => 'driver@example.com',
            'password' => 'secret123',
        ]);

        $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Another', 'last_name' => 'Driver',
            'email' => 'DRIVER@example.com', 'phone' => '0779876543',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
        ])->assertStatus(409);
    }

    private function user(string $role, string $phone): User
    {
        return User::create([
            'first_name' => 'Test', 'last_name' => 'Person',
            'email' => uniqid().'@example.com', 'phone' => $phone,
            'phone_normalized' => '94771234567', 'password' => 'password',
            'role' => $role, 'is_active' => true, 'is_verified' => true,
        ]);
    }
}
