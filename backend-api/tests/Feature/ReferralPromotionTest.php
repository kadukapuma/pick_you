<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\OtpVerification;
use App\Models\PromotionReward;
use App\Models\User;
use App\Services\Ledger\ReferralRewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralPromotionTest extends TestCase
{
    use RefreshDatabase;

    private function verifiedPassengerOtp(string $normalizedPhone): void
    {
        OtpVerification::create([
            'contact' => $normalizedPhone,
            'purpose' => 'passenger_login',
            'otp_code' => app(\App\Services\Auth\OtpCodeService::class)->storeValue('1234'),
            'is_verified' => true,
            'expires_at' => now()->addMinutes(5),
        ]);
    }

    public function test_registering_with_a_valid_promo_code_links_the_referrer(): void
    {
        $referrer = User::create([
            'first_name' => 'Existing',
            'last_name' => 'Passenger',
            'email' => 'referrer@example.com',
            'phone' => '94771112222',
            'phone_normalized' => '94771112222',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $this->verifiedPassengerOtp('94779998888');

        $this->postJson('/api/passenger/auth/register', [
            'first_name' => 'New',
            'last_name' => 'Passenger',
            'phone' => '0779998888',
            'promo_code' => '0771112222',
        ])->assertOk();

        $newUser = User::where('phone_normalized', '94779998888')->sole();

        $this->assertSame('94771112222', $newUser->promo_code);
        $this->assertSame($referrer->id, $newUser->referred_by_user_id);
    }

    public function test_registering_with_own_phone_as_promo_code_is_rejected(): void
    {
        $this->verifiedPassengerOtp('94771112222');

        $this->postJson('/api/passenger/auth/register', [
            'first_name' => 'New',
            'last_name' => 'Passenger',
            'phone' => '0771112222',
            'promo_code' => '0771112222',
        ])->assertStatus(422);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_registering_with_an_unknown_promo_code_is_rejected(): void
    {
        $this->verifiedPassengerOtp('94771112222');

        $this->postJson('/api/passenger/auth/register', [
            'first_name' => 'New',
            'last_name' => 'Passenger',
            'phone' => '0771112222',
            'promo_code' => '0779999999',
        ])->assertStatus(422);

        $this->assertDatabaseCount('users', 0);
    }

    public function test_referral_reward_service_credits_a_driver_and_records_the_ledger_entry(): void
    {
        $referrer = User::create([
            'first_name' => 'Driver',
            'last_name' => 'Referrer',
            'email' => 'driver-referrer@example.com',
            'phone' => '94771110000',
            'phone_normalized' => '94771110000',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $referrer->driver()->create(['status' => 'approved', 'availability' => 1, 'rating' => 5]);

        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin@example.com',
            'phone' => '94770000001',
            'phone_normalized' => '94770000001',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $reward = app(ReferralRewardService::class)->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'Referral bonus for 5 signups',
            createdBy: $admin,
            reference: 'test-ref-1',
        );

        $this->assertInstanceOf(PromotionReward::class, $reward);
        $this->assertSame(PromotionReward::TYPE_DRIVER_CREDIT, $reward->reward_type);

        $driverAccountBalance = LedgerAccount::where('code', LedgerAccount::codeForDriver((int) $referrer->driver->id))
            ->value('balance');
        $this->assertSame('500.00', bcadd((string) $driverAccountBalance, '0', 2));

        $this->assertDatabaseHas('journal_entries', [
            'id' => $reward->journal_entry_id,
            'type' => JournalEntry::TYPE_REFERRAL_BONUS_DRIVER,
        ]);
    }

    public function test_referral_reward_service_adds_loyalty_points_to_a_passenger(): void
    {
        $referrer = User::create([
            'first_name' => 'Passenger',
            'last_name' => 'Referrer',
            'email' => 'passenger-referrer@example.com',
            'phone' => '94771110001',
            'phone_normalized' => '94771110001',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $referrer->passenger()->create(['wallet_balance' => 0, 'loyalty_points_balance' => 0]);

        $admin = User::create([
            'first_name' => 'Admin',
            'last_name' => 'User',
            'email' => 'admin2@example.com',
            'phone' => '94770000002',
            'phone_normalized' => '94770000002',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'is_verified' => true,
        ]);

        $reward = app(ReferralRewardService::class)->creditPassengerLoyalty(
            referrer: $referrer,
            points: '150.00',
            note: 'Referral bonus for 3 signups',
            createdBy: $admin,
            reference: 'test-ref-2',
        );

        $this->assertSame(PromotionReward::TYPE_LOYALTY_POINTS, $reward->reward_type);
        $this->assertSame('150.00', bcadd((string) $referrer->passenger->fresh()->loyalty_points_balance, '0', 2));
    }
}
