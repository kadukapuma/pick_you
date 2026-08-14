<?php

namespace Tests\Feature;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\RolePermission;
use App\Models\User;
use App\Services\Ledger\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class AdminDriverSettlementTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function makeAdmin(): User
    {
        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000009');
        $admin->ensureRole(User::ROLE_ADMIN);

        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_finance',
        ]);

        return $admin;
    }

    public function test_operator_recorded_settlement_clears_driver_debt_and_balances(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        Sanctum::actingAs($driverUser, ['role:driver']);
        $this->postJson("/api/payments/{$ride->id}", [], ['Idempotency-Key' => 'cash-owing-1'])->assertOk();

        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/settlements",
            ['amount' => '60.00', 'note' => 'Bank transfer verified against WhatsApp receipt.'],
            ['Idempotency-Key' => 'settle-1'],
        )
            ->assertCreated()
            ->assertJsonPath('data.balance', '0.00')
            ->assertJsonPath('data.status', 'SETTLED');

        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        // BANK is an asset: stored credit-positive, so receiving money debits
        // it and the raw stored balance reads negative even though the human
        // (natural) balance is a positive 60.00 sitting in the account.
        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor('BANK'));
        $this->assertSame(1, JournalEntry::where('type', JournalEntry::TYPE_ADJUSTMENT)->count());
        $this->assertLedgerBalances();
    }

    public function test_repeated_settlement_request_does_not_double_credit(): void
    {
        [, $driver] = $this->makeDriver();
        DriverAccount::forDriver((int) $driver->id)->update(['credit_limit' => '-1000']);

        app(LedgerService::class)->post(
            JournalEntry::TYPE_ADJUSTMENT,
            'seed:debt',
            'Seed cash commission debt',
            [
                ['account' => "DRIVER:{$driver->id}", 'debit' => '150.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '150.00'],
            ],
        );

        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $payload = ['amount' => '150.00', 'note' => 'Bank transfer verified against WhatsApp receipt.'];
        $headers = ['Idempotency-Key' => 'settle-repeat-1'];

        $this->postJson("/api/admin/finance/drivers/{$driver->id}/settlements", $payload, $headers)->assertCreated();
        $this->postJson("/api/admin/finance/drivers/{$driver->id}/settlements", $payload, $headers)->assertCreated();

        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        // One entry for the seeded debt, one for the settlement - the repeated
        // request with the same Idempotency-Key must not add a third.
        $this->assertSame(2, JournalEntry::count());
        $this->assertLedgerBalances();
    }

    public function test_settlement_without_manage_finance_permission_is_forbidden(): void
    {
        [, $driver] = $this->makeDriver();

        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000010');
        $admin->ensureRole(User::ROLE_ADMIN);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/settlements",
            ['amount' => '60.00', 'note' => 'Bank transfer verified.'],
            ['Idempotency-Key' => 'settle-forbidden-1'],
        )->assertStatus(403);

        $this->assertSame(0, JournalEntry::count());
    }

    public function test_operator_granted_manage_finance_can_record_a_settlement(): void
    {
        [, $driver] = $this->makeDriver();
        DriverAccount::forDriver((int) $driver->id)->update(['credit_limit' => '-1000']);

        app(LedgerService::class)->post(
            JournalEntry::TYPE_ADJUSTMENT,
            'seed:operator-debt',
            'Seed cash commission debt',
            [
                ['account' => "DRIVER:{$driver->id}", 'debit' => '90.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '90.00'],
            ],
        );

        $operator = $this->makeUser(User::ROLE_OPERATOR, '0770000013');
        $operator->ensureRole(User::ROLE_OPERATOR);

        RolePermission::create([
            'role' => User::ROLE_OPERATOR,
            'permission' => 'manage_finance',
        ]);

        Sanctum::actingAs($operator, ['role:operator']);

        // This is the route the operator-lockout bug lived in: the outer
        // 'admin' middleware used to 403 every operator here regardless of
        // any RolePermission grant, before the inner permission check ran.
        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/settlements",
            ['amount' => '90.00', 'note' => 'Bank transfer verified against WhatsApp receipt.'],
            ['Idempotency-Key' => 'settle-operator-1'],
        )
            ->assertCreated()
            ->assertJsonPath('data.balance', '0.00');

        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_operator_without_manage_finance_permission_is_still_forbidden(): void
    {
        [, $driver] = $this->makeDriver();

        $operator = $this->makeUser(User::ROLE_OPERATOR, '0770000014');
        $operator->ensureRole(User::ROLE_OPERATOR);

        Sanctum::actingAs($operator, ['role:operator']);

        $this->postJson(
            "/api/admin/finance/drivers/{$driver->id}/settlements",
            ['amount' => '60.00', 'note' => 'Bank transfer verified.'],
            ['Idempotency-Key' => 'settle-operator-forbidden-1'],
        )->assertStatus(403);

        $this->assertSame(0, JournalEntry::count());
    }

    public function test_settlement_rejects_a_non_existent_driver(): void
    {
        $admin = $this->makeAdmin();
        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            '/api/admin/finance/drivers/999999/settlements',
            ['amount' => '60.00', 'note' => 'Bank transfer verified.'],
            ['Idempotency-Key' => 'settle-missing-driver'],
        )->assertStatus(404);
    }
}
