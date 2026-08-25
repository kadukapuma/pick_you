<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\OtpVerification;
use App\Models\PromotionReward;
use App\Models\RolePermission;
use App\Models\User;
use App\Services\Ledger\ReferralRewardService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class ReferralPromotionTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

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

    /** A referred user with the given number of completed rides, linked to $referrer via promo code. */
    private function makeQualifyingReferral(User $referrer, int $completedRides, string $phone = '94772220000'): User
    {
        [$referredDriverUser, $referredDriver] = $this->makeDriver($phone);
        $referredDriverUser->update(['referred_by_user_id' => $referrer->id, 'promo_code' => $referrer->phone_normalized]);

        [, $somePassenger] = $this->makePassenger('9477' . str_pad((string) random_int(1000000, 9999999), 7, '0', STR_PAD_LEFT));
        $fare = $this->makeFareConfig();

        for ($i = 0; $i < $completedRides; $i++) {
            $this->makeCompletedRide($somePassenger, $referredDriver, $fare, 500);
        }

        return $referredDriverUser;
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

        $referredUser = $this->makeQualifyingReferral($referrer, 3);

        $reward = app(ReferralRewardService::class)->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'Referral bonus: 3 completed rides',
            createdBy: $admin,
            reference: 'test-ref-1',
            referredUser: $referredUser,
        );

        $this->assertInstanceOf(PromotionReward::class, $reward);
        $this->assertSame(PromotionReward::TYPE_DRIVER_CREDIT, $reward->reward_type);
        $this->assertSame($referredUser->id, $reward->referred_user_id);

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

        $referredUser = $this->makeQualifyingReferral($referrer, 3, '94772220001');

        $reward = app(ReferralRewardService::class)->creditPassengerLoyalty(
            referrer: $referrer,
            points: '150.00',
            note: 'Referral bonus: 3 completed rides',
            createdBy: $admin,
            reference: 'test-ref-2',
            referredUser: $referredUser,
        );

        $this->assertSame(PromotionReward::TYPE_LOYALTY_POINTS, $reward->reward_type);
        $this->assertSame('150.00', bcadd((string) $referrer->passenger->fresh()->loyalty_points_balance, '0', 2));
    }

    public function test_reward_is_refused_when_referred_user_has_not_completed_enough_rides(): void
    {
        $referrer = User::create([
            'first_name' => 'Driver',
            'last_name' => 'Referrer',
            'email' => 'driver-referrer2@example.com',
            'phone' => '94771110002',
            'phone_normalized' => '94771110002',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $referrer->driver()->create(['status' => 'approved', 'availability' => 1, 'rating' => 5]);
        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000003');

        $referredUser = $this->makeQualifyingReferral($referrer, 0, '94772220002');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('at least 1 are required');

        app(ReferralRewardService::class)->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'Too early',
            createdBy: $admin,
            reference: 'test-ref-3',
            referredUser: $referredUser,
        );
    }

    public function test_reward_is_refused_for_a_user_not_referred_by_this_owner(): void
    {
        $referrer = User::create([
            'first_name' => 'Driver',
            'last_name' => 'Referrer',
            'email' => 'driver-referrer3@example.com',
            'phone' => '94771110003',
            'phone_normalized' => '94771110003',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $referrer->driver()->create(['status' => 'approved', 'availability' => 1, 'rating' => 5]);
        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000004');

        $otherReferrer = $this->makeUser(User::ROLE_PASSENGER, '94770000005');
        $unrelatedUser = $this->makeQualifyingReferral($otherReferrer, 3, '94772220003');

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('not referred by this promotion code owner');

        app(ReferralRewardService::class)->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'Wrong referrer',
            createdBy: $admin,
            reference: 'test-ref-4',
            referredUser: $unrelatedUser,
        );
    }

    public function test_reward_cannot_be_issued_twice_for_the_same_referred_signup(): void
    {
        $referrer = User::create([
            'first_name' => 'Driver',
            'last_name' => 'Referrer',
            'email' => 'driver-referrer4@example.com',
            'phone' => '94771110004',
            'phone_normalized' => '94771110004',
            'role' => User::ROLE_DRIVER,
            'is_active' => true,
            'is_verified' => true,
        ]);
        $referrer->driver()->create(['status' => 'approved', 'availability' => 1, 'rating' => 5]);
        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000006');

        $referredUser = $this->makeQualifyingReferral($referrer, 3, '94772220004');
        $service = app(ReferralRewardService::class);

        $service->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'First reward',
            createdBy: $admin,
            reference: 'test-ref-5a',
            referredUser: $referredUser,
        );

        $this->expectException(\DomainException::class);
        $this->expectExceptionMessage('already been issued');

        $service->creditDriver(
            referrer: $referrer,
            amount: '500.00',
            note: 'Second reward attempt',
            createdBy: $admin,
            reference: 'test-ref-5b',
            referredUser: $referredUser,
        );
    }

    public function test_admin_search_reports_ride_counts_for_the_referrers_roles(): void
    {
        // The test helper stores phone_normalized as an exact copy of the
        // given phone rather than running it through the real normalizer, so
        // pass it already in normalized form (94-prefixed) to match how the
        // controller looks the referrer up.
        [$driverUser, $driver] = $this->makeDriver('94779990001');
        [$passenger1] = $this->makePassenger('94771110001');
        [$passenger2] = $this->makePassenger('94771110002');
        $fare = $this->makeFareConfig();
        $this->makeCompletedRide($passenger1->passenger, $driver, $fare, 500);
        $this->makeCompletedRide($passenger2->passenger, $driver, $fare, 700);

        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000010');
        $admin->ensureRole(User::ROLE_ADMIN);
        Sanctum::actingAs($admin, ['role:admin']);

        $this->getJson('/api/admin/promotions/search?phone=94779990001')
            ->assertOk()
            ->assertJsonPath('data.referrer.is_driver', true)
            ->assertJsonPath('data.referrer.total_rides_as_driver', 2)
            ->assertJsonPath('data.referrer.is_passenger', false)
            ->assertJsonPath('data.referrer.total_rides_as_passenger', null);
    }

    public function test_admin_search_reports_eligibility_per_referred_user(): void
    {
        $referrer = $this->makeUser(User::ROLE_PASSENGER, '94771119998');

        $eligible = $this->makeQualifyingReferral($referrer, 1, '94772220005');
        $tooEarly = $this->makeQualifyingReferral($referrer, 0, '94772220006');

        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000012');
        $admin->ensureRole(User::ROLE_ADMIN);
        Sanctum::actingAs($admin, ['role:admin']);

        $response = $this->getJson('/api/admin/promotions/search?phone=94771119998')->assertOk();

        $rows = collect($response->json('data.referred_users.data'))->keyBy('id');

        $this->assertSame(1, $rows[$eligible->id]['completed_rides']);
        $this->assertTrue($rows[$eligible->id]['eligible_for_reward']);
        $this->assertFalse($rows[$eligible->id]['already_rewarded']);

        $this->assertSame(0, $rows[$tooEarly->id]['completed_rides']);
        $this->assertFalse($rows[$tooEarly->id]['eligible_for_reward']);

        $response->assertJsonPath('data.min_rides_for_reward', 1);
    }

    public function test_admin_reward_endpoint_rejects_an_ineligible_referred_user(): void
    {
        $referrer = $this->makeUser(User::ROLE_DRIVER, '94771110007');
        $referrer->driver()->create(['status' => 'approved', 'availability' => 1, 'rating' => 5]);
        $tooEarly = $this->makeQualifyingReferral($referrer, 0, '94772220007');

        $admin = $this->makeUser(User::ROLE_ADMIN, '94770000013');
        $admin->ensureRole(User::ROLE_ADMIN);
        RolePermission::create(['role' => User::ROLE_ADMIN, 'permission' => 'manage_promotions']);
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/promotions/users/{$referrer->id}/reward-driver",
            ['amount' => '500.00', 'note' => 'Too early', 'referred_user_id' => $tooEarly->id],
            ['Idempotency-Key' => 'reward-reject-1'],
        )->assertStatus(422);
    }

    public function test_admin_usage_endpoint_lists_all_users_with_referral_counts_and_paginates(): void
    {
        $referrer = User::create([
            'first_name' => 'Popular',
            'last_name' => 'Referrer',
            'email' => 'popular@example.com',
            'phone' => '94771119999',
            'phone_normalized' => '94771119999',
            'role' => User::ROLE_PASSENGER,
            'is_active' => true,
            'is_verified' => true,
        ]);

        foreach (range(1, 3) as $i) {
            User::create([
                'first_name' => "Referred{$i}",
                'last_name' => 'User',
                'email' => "referred{$i}@example.com",
                'phone' => "9477000000{$i}",
                'phone_normalized' => "9477000000{$i}",
                'promo_code' => '94771119999',
                'referred_by_user_id' => $referrer->id,
                'role' => User::ROLE_PASSENGER,
                'is_active' => true,
                'is_verified' => true,
            ]);
        }

        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000011');
        $admin->ensureRole(User::ROLE_ADMIN);
        Sanctum::actingAs($admin, ['role:admin']);

        $response = $this->getJson('/api/admin/promotions/usage')->assertOk();

        $data = $response->json('data.data');
        $this->assertSame($referrer->id, $data[0]['id']);
        $this->assertSame(3, $data[0]['promo_code_use_count']);
        $this->assertArrayHasKey('current_page', $response->json('data'));
        $this->assertArrayHasKey('last_page', $response->json('data'));
    }
}
