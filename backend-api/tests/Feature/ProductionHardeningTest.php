<?php

namespace Tests\Feature;

use App\Models\IdempotencyRecord;
use App\Models\OtpVerification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ProductionHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_otp_is_not_returned_outside_local_debug(): void
    {
        config([
            'app.debug' => false,
            'services.notifylk' => [
                'url' => 'https://notify.test/send',
                'user_id' => '12345',
                'api_key' => 'test-key',
                'sender_id' => 'PickYou',
            ],
        ]);
        app()->detectEnvironment(fn () => 'production');
        Http::fake(['https://notify.test/*' => Http::response(['status' => 'success'])]);

        $this->postJson('/api/passenger/auth/otp/send', [
            'phone' => '0771234567',
        ])
            ->assertOk()
            ->assertJsonMissingPath('data.otp');

        $otp = OtpVerification::firstOrFail();
        $this->assertNotSame(4, strlen((string) $otp->otp_code));
        $this->assertGreaterThan(20, strlen((string) $otp->otp_code));
    }

    public function test_otp_is_returned_in_local_debug_for_manual_testing(): void
    {
        config([
            'app.debug' => true,
            'services.notifylk' => [
                'url' => 'https://notify.test/send',
                'user_id' => '12345',
                'api_key' => 'test-key',
                'sender_id' => 'PickYou',
            ],
        ]);
        app()->detectEnvironment(fn () => 'local');
        Http::fake(['https://notify.test/*' => Http::response(['status' => 'success'])]);

        $this->postJson('/api/passenger/auth/otp/send', [
            'phone' => '0771234567',
        ])
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure(['data' => ['otp']]);
    }

    public function test_public_auth_routes_are_throttled(): void
    {
        config(['auth.auth_rate_limit_per_minute' => 2]);

        for ($i = 0; $i < 2; $i++) {
            $this->postJson('/api/login', [
                'email' => 'missing@example.com',
                'password' => 'password',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'email' => 'missing@example.com',
            'password' => 'password',
        ])->assertTooManyRequests();
    }

    public function test_prune_commands_remove_expired_records(): void
    {
        $user = User::create([
            'first_name' => 'Test',
            'last_name' => 'Person',
            'email' => 'prune@example.com',
            'phone' => '0771234567',
            'password' => 'password',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
        ]);

        OtpVerification::create([
            'user_id' => $user->id,
            'contact' => '94771234567',
            'purpose' => 'test',
            'otp_code' => 'legacy',
            'expires_at' => now()->subDays(2),
        ]);
        IdempotencyRecord::create([
            'user_id' => $user->id,
            'key' => 'expired-key',
            'request_hash' => str_repeat('a', 64),
            'status' => 'COMPLETED',
            'expires_at' => now()->subMinute(),
        ]);

        $this->artisan('otp:prune-expired')->assertSuccessful();
        $this->artisan('idempotency:prune-expired')->assertSuccessful();

        $this->assertDatabaseCount('otp_verifications', 0);
        $this->assertDatabaseCount('idempotency_records', 0);
    }
}
