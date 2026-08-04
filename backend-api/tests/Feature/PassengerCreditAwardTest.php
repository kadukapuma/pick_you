<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\User;
use App\Models\WalletTransaction;
use App\Models\Payment;
use App\Models\PaymentAllocation;
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

    public function test_credit_can_be_reserved_once_for_a_payment(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $creditService = app(PassengerCreditService::class);

        $creditService->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'reservation-credit-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'reservation-payment-1',
            'payment_status' => 'PENDING',
        ]);

        $allocation = $creditService->reserve(
            payment: $payment,
            amount: '500.00',
            reference: 'payment-credit-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(
            '500.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            PaymentAllocation::TYPE_PICKU_CREDIT,
            $allocation->type
        );
        $this->assertSame('500.00', $allocation->amount);
        $this->assertSame(
            PaymentAllocation::STATUS_RESERVED,
            $allocation->status
        );

        $second = $creditService->reserve(
            payment: $payment,
            amount: '500.00',
            reference: 'payment-credit-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame($allocation->id, $second->id);
        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(
            '500.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            1,
            PaymentAllocation::where(
                'payment_id',
                $payment->id
            )->count()
        );

        $this->assertSame(
            1,
            WalletTransaction::where(
                'transaction_type',
                WalletTransaction::TYPE_CREDIT_RESERVATION
            )->count()
        );

        // Reserving credit does not create another accounting entry.
        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_PASSENGER_CREDIT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_reserved_credit_is_released_once_after_failure(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $creditService = app(PassengerCreditService::class);

        $creditService->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'release-credit-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'release-payment-1',
            'payment_status' => 'PENDING',
        ]);

        $allocation = $creditService->reserve(
            payment: $payment,
            amount: '500.00',
            reference: 'release-reservation-1',
        );

        $released = $creditService->release(
            allocation: $allocation,
            reference: 'release-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            PaymentAllocation::STATUS_RELEASED,
            $released->status
        );

        // Replaying the release cannot return the credit twice.
        $secondRelease = $creditService->release(
            allocation: $allocation,
            reference: 'release-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame($released->id, $secondRelease->id);
        $this->assertSame('10500.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            1,
            WalletTransaction::where(
                'transaction_type',
                WalletTransaction::TYPE_CREDIT_RELEASED
            )->count()
        );

        // Awarding created one journal entry. Reserve and release add none.
        $this->assertSame(1, JournalEntry::count());
        $this->assertLedgerBalances();
    }
    public function test_reserved_credit_is_consumed_once_after_success(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $creditService = app(PassengerCreditService::class);

        $creditService->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'consume-credit-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'consume-payment-1',
            'payment_status' => 'PENDING',
        ]);

        $allocation = $creditService->reserve(
            payment: $payment,
            amount: '500.00',
            reference: 'consume-reservation-1',
        );

        $consumed = $creditService->consume(
            allocation: $allocation,
            reference: 'consume-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            PaymentAllocation::STATUS_COMPLETED,
            $consumed->status
        );

        // Replaying consumption must not deduct the credit again.
        $secondConsumption = $creditService->consume(
            allocation: $allocation,
            reference: 'consume-reservation-1',
        );

        $passenger->refresh();

        $this->assertSame(
            $consumed->id,
            $secondConsumption->id
        );
        $this->assertSame('10000.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            1,
            WalletTransaction::where(
                'transaction_type',
                WalletTransaction::TYPE_CREDIT_CONSUMED
            )->count()
        );

        $this->assertSame(1, JournalEntry::count());
        $this->assertLedgerBalances();
    }

    public function test_reservation_uses_only_available_credit(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        // Start this scenario with no existing test wallet balance.
        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $creditService = app(PassengerCreditService::class);

        $creditService->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'partial-reservation-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'partial-reservation-payment',
            'payment_status' => 'PENDING',
        ]);

        // Ask to reserve up to the whole fare. Only 500 is available.
        $allocation = $creditService->reserve(
            payment: $payment,
            amount: '800.00',
            reference: 'partial-reservation-1',
        );

        $this->assertNotNull($allocation);
        $this->assertSame('500.00', $allocation->amount);

        $passenger->refresh();

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '500.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertLedgerBalances();
    }
    public function test_passenger_can_view_only_their_credit_balance_and_history(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $otherPassenger] = $this->makePassenger(
            '0771234568'
        );

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $otherPassenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        $service = app(PassengerCreditService::class);

        $service->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'Credit belonging to this passenger.',
            reference: 'history-passenger-credit',
        );

        $service->award(
            passenger: $otherPassenger,
            amount: '900.00',
            createdBy: $admin,
            reason: 'Credit belonging to another passenger.',
            reference: 'history-other-credit',
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->getJson('/api/passenger/credits')
            ->assertOk()
            ->assertJsonPath(
                'data.available_balance',
                '500.00'
            )
            ->assertJsonPath(
                'data.reserved_balance',
                '0.00'
            )
            ->assertJsonCount(
                1,
                'data.transactions.data'
            )
            ->assertJsonPath(
                'data.transactions.data.0.user_id',
                $passengerUser->id
            )
            ->assertJsonPath(
                'data.transactions.data.0.amount',
                '500.00'
            )
            ->assertJsonMissing([
                'description'
                => 'Credit belonging to another passenger.',
            ]);
    }

    public function test_different_requests_cannot_reserve_same_payment_twice(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '500.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_wallet_credit' => true]
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'duplicate-reservation-payment',
            'payment_status' => 'PENDING',
        ]);

        $service = app(PassengerCreditService::class);

        $first = $service->reserve(
            payment: $payment,
            amount: '800.00',
            reference: 'reservation-request-one',
        );

        $second = $service->reserve(
            payment: $payment,
            amount: '800.00',
            reference: 'reservation-request-two',
        );

        $passenger->refresh();

        $this->assertNotNull($first);
        $this->assertNotNull($second);
        $this->assertSame($first->id, $second->id);

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '500.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            1,
            PaymentAllocation::where(
                'payment_id',
                $payment->id
            )->count()
        );

        $this->assertSame(
            1,
            WalletTransaction::where(
                'transaction_type',
                WalletTransaction::TYPE_CREDIT_RESERVATION
            )->count()
        );
    }
}
