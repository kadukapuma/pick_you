<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\RolePermission;
use App\Models\User;
use App\Services\Ledger\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class AdminDriverPayoutTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function makeAdmin(): User
    {
        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000011');
        $admin->ensureRole(User::ROLE_ADMIN);

        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_finance',
        ]);

        return $admin;
    }

    public function test_operator_recorded_payout_clears_what_picku_owes_and_balances(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-owed-1'])->assertOk();

        $this->assertSame('1880.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/payouts",
            ['amount' => '1880.00', 'note' => 'Bank transfer sent, confirmed via WhatsApp.'],
            ['Idempotency-Key' => 'payout-1'],
        )
            ->assertCreated()
            ->assertJsonPath('data.balance', '0.00')
            ->assertJsonPath('data.status', 'SETTLED');

        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        // BANK is an asset: paying money out credits it, so the raw
        // credit-positive stored balance reads positive even though the
        // natural (human) balance of an asset going down reads negative.
        $this->assertSame('1880.00', app(LedgerService::class)->balanceFor('BANK'));
        $this->assertSame(1, JournalEntry::where('type', JournalEntry::TYPE_PAYOUT_PAID)->count());
        $this->assertLedgerBalances();
    }

    public function test_repeated_payout_request_does_not_double_pay(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-owed-2'])->assertOk();

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $payload = ['amount' => '1880.00', 'note' => 'Bank transfer sent.'];
        $headers = ['Idempotency-Key' => 'payout-repeat-1'];

        $this->postJson("/api/admin/finance/drivers/{$driver->id}/payouts", $payload, $headers)->assertCreated();
        $this->postJson("/api/admin/finance/drivers/{$driver->id}/payouts", $payload, $headers)->assertCreated();

        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame(1, JournalEntry::where('type', JournalEntry::TYPE_PAYOUT_PAID)->count());
        $this->assertLedgerBalances();
    }

    public function test_payout_cannot_exceed_the_amount_owed(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $this->makeCard($passenger);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'card-owed-3'])->assertOk();

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/payouts",
            ['amount' => '5000.00', 'note' => 'Attempted overpayment.'],
            ['Idempotency-Key' => 'payout-overpay-1'],
        )->assertStatus(422);

        $this->assertSame('1880.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame(0, JournalEntry::where('type', JournalEntry::TYPE_PAYOUT_PAID)->count());
        $this->assertLedgerBalances();
    }

    public function test_payout_is_rejected_when_the_driver_owes_picku(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'cash-owing-2'])->assertOk();

        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/payouts",
            ['amount' => '10.00', 'note' => 'Should be rejected.'],
            ['Idempotency-Key' => 'payout-owing-1'],
        )->assertStatus(422);

        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertLedgerBalances();
    }

    public function test_payout_without_manage_finance_permission_is_forbidden(): void
    {
        [, $driver] = $this->makeDriver();

        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000012');
        $admin->ensureRole(User::ROLE_ADMIN);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/payouts",
            ['amount' => '60.00', 'note' => 'Bank transfer sent.'],
            ['Idempotency-Key' => 'payout-forbidden-1'],
        )->assertStatus(403);

        $this->assertSame(0, JournalEntry::count());
    }

    public function test_payout_rejects_a_non_existent_driver(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            '/api/admin/finance/drivers/999999/payouts',
            ['amount' => '60.00', 'note' => 'Bank transfer sent.'],
            ['Idempotency-Key' => 'payout-missing-driver'],
        )->assertStatus(404);
    }
}
