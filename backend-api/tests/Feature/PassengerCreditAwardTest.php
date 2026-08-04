<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Services\Ledger\LedgerService;
use App\Services\Payments\PassengerCreditService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;
use App\Models\RolePermission;
use Laravel\Sanctum\Sanctum;

class PassengerCreditAwardTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_awarding_credit_updates_balance_history_and_ledger(): void
    {
        [, $passenger] = $this->makePassenger();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $transaction = app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'Compensation for a system error.',
            reference: 'credit-award-test-1',
        );

        $passenger->refresh();

        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            WalletTransaction::TYPE_CREDIT_AWARD,
            $transaction->transaction_type
        );
        $this->assertSame('500.00', $transaction->amount);
        $this->assertSame('10500.00', $transaction->balance_after);
        $this->assertSame($admin->id, $transaction->created_by);
        $this->assertSame(
            'Compensation for a system error.',
            $transaction->description
        );

        $this->assertSame(
            '500.00',
            app(LedgerService::class)->balanceFor(
                'PASSENGER_WALLET_LIABILITY'
            )
        );

        // Expense accounts are debit-positive to a human, but raw ledger
        // balances use the system-wide credit-positive convention.
        $this->assertSame(
            '-500.00',
            app(LedgerService::class)->balanceFor(
                'PASSENGER_CREDIT_EXPENSE'
            )
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_PASSENGER_CREDIT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_same_reference_cannot_award_credit_twice(): void
    {
        [, $passenger] = $this->makePassenger();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $service = app(PassengerCreditService::class);

        $first = $service->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'credit-award-idempotent',
        );

        $second = $service->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'credit-award-idempotent',
        );

        $passenger->refresh();

        $this->assertSame($first->id, $second->id);
        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(1, WalletTransaction::count());

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_PASSENGER_CREDIT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_authorized_admin_can_award_passenger_credit(): void
    {
        [, $passenger] = $this->makePassenger();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '500.00',
                'reason' => 'Compensation for a system error.',
            ],
            ['Idempotency-Key' => 'admin-credit-award-1']
        )
            ->assertCreated()
            ->assertJsonPath('data.passenger_id', $passenger->id)
            ->assertJsonPath('data.wallet_balance', '10500.00')
            ->assertJsonPath(
                'data.wallet_reserved_balance',
                '0.00'
            )
            ->assertJsonPath(
                'data.transaction.transaction_type',
                WalletTransaction::TYPE_CREDIT_AWARD
            );

        $passenger->refresh();

        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(1, WalletTransaction::count());

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_PASSENGER_CREDIT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_same_api_idempotency_key_does_not_award_twice(): void
    {
        [, $passenger] = $this->makePassenger();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $payload = [
            'amount' => '500.00',
            'reason' => 'Duplicate-safe compensation.',
        ];

        $headers = [
            'Idempotency-Key' => 'admin-credit-idempotent-1',
        ];

        $firstResponse = $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            $payload,
            $headers
        )->assertCreated();

        $secondResponse = $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            $payload,
            $headers
        )->assertCreated();

        $this->assertSame(
            $firstResponse->json(),
            $secondResponse->json()
        );

        $passenger->refresh();

        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(1, WalletTransaction::count());

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_PASSENGER_CREDIT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_operator_with_permission_can_award_credit(): void
    {
        [, $passenger] = $this->makePassenger();

        $operator = $this->makeUser(
            User::ROLE_OPERATOR,
            '0770000002'
        );
        $operator->ensureRole(User::ROLE_OPERATOR);

        RolePermission::create([
            'role' => User::ROLE_OPERATOR,
            'permission' => 'manage_passenger_credits',
        ]);

        Sanctum::actingAs($operator, ['role:operator']);

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '250.00',
                'reason' => 'Approved service compensation.',
            ],
            ['Idempotency-Key' => 'operator-credit-award-1']
        )
            ->assertCreated()
            ->assertJsonPath('data.wallet_balance', '10250.00');

        $passenger->refresh();

        $this->assertSame('10250.00', $passenger->wallet_balance);
        $this->assertSame(1, WalletTransaction::count());
        $this->assertLedgerBalances();
    }

    public function test_operator_without_permission_cannot_award_credit(): void
    {
        [, $passenger] = $this->makePassenger();

        $operator = $this->makeUser(
            User::ROLE_OPERATOR,
            '0770000002'
        );
        $operator->ensureRole(User::ROLE_OPERATOR);

        Sanctum::actingAs($operator, ['role:operator']);

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '250.00',
                'reason' => 'Unauthorized attempt.',
            ],
            ['Idempotency-Key' => 'operator-no-permission-1']
        )->assertForbidden();

        $passenger->refresh();

        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(0, WalletTransaction::count());
        $this->assertSame(0, JournalEntry::count());
    }

    public function test_passenger_cannot_award_credit_to_themselves(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '500.00',
                'reason' => 'Self-awarded credit.',
            ],
            ['Idempotency-Key' => 'passenger-self-credit-1']
        )->assertForbidden();

        $passenger->refresh();

        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(0, WalletTransaction::count());
        $this->assertSame(0, JournalEntry::count());
    }
    public function test_invalid_credit_awards_do_not_change_money(): void
    {
        [, $passenger] = $this->makePassenger();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        RolePermission::create([
            'role' => User::ROLE_ADMIN,
            'permission' => 'manage_passenger_credits',
        ]);

        Sanctum::actingAs($admin, ['role:admin']);

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '0.00',
                'reason' => 'Zero amount.',
            ],
            ['Idempotency-Key' => 'invalid-credit-zero']
        )->assertUnprocessable();

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '-10.00',
                'reason' => 'Negative amount.',
            ],
            ['Idempotency-Key' => 'invalid-credit-negative']
        )->assertUnprocessable();

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '100000.01',
                'reason' => 'Above the request limit.',
            ],
            ['Idempotency-Key' => 'invalid-credit-too-large']
        )->assertUnprocessable();

        $this->postJson(
            "/api/passengers/{$passenger->id}/credits",
            [
                'amount' => '500.00',
            ],
            ['Idempotency-Key' => 'invalid-credit-no-reason']
        )->assertUnprocessable();

        $passenger->refresh();

        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(0, WalletTransaction::count());
        $this->assertSame(0, JournalEntry::count());
    }
}
