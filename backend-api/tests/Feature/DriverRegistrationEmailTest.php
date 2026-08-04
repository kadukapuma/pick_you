<?php

namespace Tests\Feature;

use App\Models\OtpVerification;
use App\Models\PendingDriverEnrollment;
use App\Models\User;
use App\Services\Auth\OtpCodeService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The email captured at driver registration was being discarded: verifyOtp()
 * hardcoded users.email to null when creating the account, even though the
 * address was validated and stored in driver_credentials.login_email. It was
 * never lost from login purposes, but every other part of the app that reads
 * user.email (the admin driver list/detail views included) saw a blank.
 */
class DriverRegistrationEmailTest extends TestCase
{
    use RefreshDatabase;

    public function test_driver_email_is_saved_on_the_user_record(): void
    {
        $response = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Test',
            'last_name' => 'Driver',
            'email' => 'newdriver@example.com',
            'phone' => '0771112222',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(202);

        $token = $response->json('data.enrollment_token');
        $enrollment = PendingDriverEnrollment::sole();

        $code = '1234';
        OtpVerification::create([
            'contact' => $enrollment->phone_normalized,
            'purpose' => 'driver_registration',
            'otp_code' => app(OtpCodeService::class)->storeValue($code),
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $token,
            'otp_code' => $code,
        ])->assertCreated();

        $user = User::where('phone_normalized', $enrollment->phone_normalized)->sole();

        $this->assertSame('newdriver@example.com', $user->email);
        $this->assertSame(
            'newdriver@example.com',
            \App\Models\DriverCredential::where('driver_id', $user->driver->id)->value('login_email'),
        );
    }

    public function test_registering_with_an_email_already_on_another_account_is_rejected_early(): void
    {
        User::create([
            'first_name' => 'Existing',
            'last_name' => 'Passenger',
            'email' => 'taken@example.com',
            'phone' => '0779998888',
            'phone_normalized' => '0779998888',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $this->postJson('/api/driver/auth/register', [
            'first_name' => 'New',
            'last_name' => 'Driver',
            'email' => 'taken@example.com',
            'phone' => '0771234567',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(409);

        $this->assertDatabaseCount('pending_driver_enrollments', 0);
    }

    public function test_becoming_a_driver_does_not_overwrite_an_existing_verified_email(): void
    {
        $passenger = User::create([
            'first_name' => 'Existing',
            'last_name' => 'Passenger',
            'email' => 'passenger-real-email@example.com',
            'phone' => '0776665555',
            'phone_normalized' => '0776665555',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $response = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'Existing',
            'last_name' => 'Passenger',
            'email' => 'different-driver-email@example.com',
            'phone' => '0776665555',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(202);

        $token = $response->json('data.enrollment_token');
        $enrollment = PendingDriverEnrollment::sole();

        $code = '1234';
        OtpVerification::create([
            'contact' => $enrollment->phone_normalized,
            'purpose' => 'driver_registration',
            'otp_code' => app(OtpCodeService::class)->storeValue($code),
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $token,
            'otp_code' => $code,
        ])->assertCreated();

        // The passenger's own, already-verified email must survive - not be
        // silently replaced by whatever was typed on the driver signup form.
        $this->assertSame('passenger-real-email@example.com', $passenger->fresh()->email);

        // But the driver login email is still exactly what they registered with.
        $this->assertSame(
            'different-driver-email@example.com',
            \App\Models\DriverCredential::where('driver_id', $passenger->fresh()->driver->id)->value('login_email'),
        );
    }

    public function test_becoming_a_driver_backfills_a_missing_email(): void
    {
        $existing = User::create([
            'first_name' => 'No',
            'last_name' => 'Email',
            'email' => null,
            'phone' => '0775554444',
            'phone_normalized' => '0775554444',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $response = $this->postJson('/api/driver/auth/register', [
            'first_name' => 'No',
            'last_name' => 'Email',
            'email' => 'backfilled@example.com',
            'phone' => '0775554444',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(202);

        $token = $response->json('data.enrollment_token');
        $enrollment = PendingDriverEnrollment::sole();

        $code = '1234';
        OtpVerification::create([
            'contact' => $enrollment->phone_normalized,
            'purpose' => 'driver_registration',
            'otp_code' => app(OtpCodeService::class)->storeValue($code),
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5),
        ]);

        $this->postJson('/api/driver/auth/otp/verify', [
            'enrollment_token' => $token,
            'otp_code' => $code,
        ])->assertCreated();

        $this->assertSame('backfilled@example.com', $existing->fresh()->email);
    }
}
