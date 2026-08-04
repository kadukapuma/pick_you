<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PassengerCreditService;
use Laravel\Sanctum\Sanctum;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class SplitPaymentSettlementTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    public function test_credit_and_card_allocations_settle_together(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

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
            'transaction_id' => 'split-card-payment-1',
            'payment_status' => 'COMPLETED',
            'gateway' => 'mock',
            'gateway_reference' => 'split-card-reference-1',
            'paid_at' => now(),
        ]);

        $payment->allocations()->createMany([
            [
                'type' => PaymentAllocation::TYPE_PICKU_CREDIT,
                'amount' => '500.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-card-credit-1',
                'completed_at' => now(),
            ],
            [
                'type' => PaymentAllocation::TYPE_CARD,
                'amount' => '300.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-card-remainder-1',
                'completed_at' => now(),
            ],
        ]);

        app(RideSettlementService::class)->settle(
            $payment->refresh()
        );

        $ledger = app(LedgerService::class);

        $this->assertSame(
            '-500.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );

        $this->assertSame(
            '-300.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );

        // Six percent of LKR 800.
        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );

        // Driver receives 94 percent of LKR 800.
        $this->assertSame(
            '752.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }
    public function test_credit_and_cash_allocations_settle_together(): void
    {
        [, $passenger] = $this->makePassenger(
            '0771234568'
        );
        [, $driver] = $this->makeDriver(
            '0777654322'
        );
        $fare = $this->makeFareConfig();

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'cash'
        );

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'cash',
            'amount' => '800.00',
            'transaction_id' => 'split-cash-payment-1',
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
        ]);

        $payment->allocations()->createMany([
            [
                'type' => PaymentAllocation::TYPE_PICKU_CREDIT,
                'amount' => '500.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-cash-credit-1',
                'completed_at' => now(),
            ],
            [
                'type' => PaymentAllocation::TYPE_CASH,
                'amount' => '300.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-cash-remainder-1',
                'completed_at' => now(),
            ],
        ]);

        app(RideSettlementService::class)->settle(
            $payment->refresh()
        );

        $ledger = app(LedgerService::class);

        $this->assertSame(
            '-500.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );

        $this->assertSame(
            '0.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );

        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );

        // Driver earns 752 and already collected 300 cash,
        // so PickU still owes the driver 452.
        $this->assertSame(
            '452.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_split_payment_settlement_occurs_only_once(): void
    {
        [, $passenger] = $this->makePassenger(
            '0771234569'
        );
        [, $driver] = $this->makeDriver(
            '0777654323'
        );
        $fare = $this->makeFareConfig();

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
            'transaction_id' => 'split-idempotent-payment-1',
            'payment_status' => 'COMPLETED',
            'gateway' => 'mock',
            'gateway_reference'
            => 'split-idempotent-reference-1',
            'paid_at' => now(),
        ]);

        $payment->allocations()->createMany([
            [
                'type' => PaymentAllocation::TYPE_PICKU_CREDIT,
                'amount' => '500.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-idempotent-credit-1',
                'completed_at' => now(),
            ],
            [
                'type' => PaymentAllocation::TYPE_CARD,
                'amount' => '300.00',
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'reference' => 'split-idempotent-card-1',
                'completed_at' => now(),
            ],
        ]);

        $settlement = app(RideSettlementService::class);

        $firstEntry = $settlement->settle($payment->refresh());
        $secondEntry = $settlement->settle($payment->refresh());

        $this->assertSame($firstEntry->id, $secondEntry->id);

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $ledger = app(LedgerService::class);

        $this->assertSame(
            '-500.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '-300.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );
        $this->assertSame(
            '752.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertLedgerBalances();
    }
    public function test_payment_endpoint_combines_credit_and_card(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'split-end-to-end-credit-award',
        );

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_SUCCESS
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_wallet_credit' => true]
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $firstResponse = $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-card-end-to-end-1']
        )
            ->assertOk()
            ->assertJsonPath('data.amount', '800.00')
            ->assertJsonPath('data.payment_status', 'COMPLETED');
        $secondResponse = $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-card-end-to-end-1']
        )->assertOk();

        $this->assertSame(
            $firstResponse->json(),
            $secondResponse->json()
        );

        $payment = Payment::where(
            'ride_id',
            $ride->id
        )->sole();

        $this->assertSame(
            1,
            $payment->attempts()->count()
        );

        $this->assertSame(
            2,
            $payment->allocations()->count()
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertSame('800.00', $payment->amount);

        $attempt = $payment->attempts()->sole();

        $this->assertSame('300.00', $attempt->amount);
        $this->assertSame('COMPLETED', $attempt->status);

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD => '300.00',
                PaymentAllocation::TYPE_PICKU_CREDIT => '500.00',
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('amount', 'type')
                ->all()
        );

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD
                => PaymentAllocation::STATUS_COMPLETED,
                PaymentAllocation::TYPE_PICKU_CREDIT
                => PaymentAllocation::STATUS_COMPLETED,
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('status', 'type')
                ->all()
        );

        $passenger->refresh();

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $ledger = app(LedgerService::class);

        // Credit award created +500 liability; settlement consumed it.
        $this->assertSame(
            '0.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '-300.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );
        $this->assertSame(
            '752.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertLedgerBalances();
    }
    public function test_card_decline_releases_reserved_credit(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'split-decline-credit-award',
        );

        $card = $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_DECLINED
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_wallet_credit' => true]
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-card-decline-1']
        )->assertStatus(402);

        $payment = Payment::where(
            'ride_id',
            $ride->id
        )->sole();

        $this->assertSame('DECLINED', $payment->payment_status);
        $this->assertSame(
            '300.00',
            $payment->attempts()->sole()->amount
        );

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD
                => PaymentAllocation::STATUS_RELEASED,
                PaymentAllocation::TYPE_PICKU_CREDIT
                => PaymentAllocation::STATUS_RELEASED,
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('status', 'type')
                ->all()
        );

        $passenger->refresh();

        $this->assertSame('500.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            0,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $ledger = app(LedgerService::class);

        // Only the original credit award remains in the books.
        $this->assertSame(
            '500.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '0.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '0.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );
        $this->assertSame(
            '0.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertLedgerBalances();
        // A deliberate retry reserves the released credit again.
        $card->update([
            'last4' => substr(
                MockPaymentGateway::CARD_SUCCESS,
                -4
            ),
        ]);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-card-retry-2']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment->refresh();
        $passenger->refresh();

        $this->assertSame(2, $payment->attempts()->count());

        $this->assertSame(
            ['DECLINED', 'COMPLETED'],
            $payment->attempts()
                ->orderBy('attempt_number')
                ->pluck('status')
                ->all()
        );

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD
                => PaymentAllocation::STATUS_COMPLETED,
                PaymentAllocation::TYPE_PICKU_CREDIT
                => PaymentAllocation::STATUS_COMPLETED,
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('status', 'type')
                ->all()
        );

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertSame(
            '0.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '-300.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );
        $this->assertSame(
            '752.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertLedgerBalances();
    }

    public function test_unknown_card_result_keeps_credit_reserved(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'split-unknown-credit-award',
        );

        $this->makeCard(
            $passenger,
            MockPaymentGateway::CARD_UNKNOWN
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_wallet_credit' => true]
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-card-unknown-1']
        )
            ->assertStatus(202)
            ->assertJsonPath('data.payment_status', 'UNKNOWN');

        $payment = Payment::where(
            'ride_id',
            $ride->id
        )->sole();

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD
                => PaymentAllocation::STATUS_RESERVED,
                PaymentAllocation::TYPE_PICKU_CREDIT
                => PaymentAllocation::STATUS_RESERVED,
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('status', 'type')
                ->all()
        );

        $passenger->refresh();

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '500.00',
            $passenger->wallet_reserved_balance
        );

        $this->assertSame(
            0,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }
    public function test_payment_endpoint_combines_credit_and_cash(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'split-cash-end-to-end-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'cash',
            ['use_wallet_credit' => true]
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'split-cash-end-to-end-1']
        )
            ->assertOk()
            ->assertJsonPath('data.amount', '800.00')
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment = Payment::where(
            'ride_id',
            $ride->id
        )->sole();

        $this->assertSame(0, $payment->attempts()->count());

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CASH => '300.00',
                PaymentAllocation::TYPE_PICKU_CREDIT => '500.00',
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('amount', 'type')
                ->all()
        );

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CASH
                => PaymentAllocation::STATUS_COMPLETED,
                PaymentAllocation::TYPE_PICKU_CREDIT
                => PaymentAllocation::STATUS_COMPLETED,
            ],
            $payment->allocations()
                ->orderBy('type')
                ->pluck('status', 'type')
                ->all()
        );

        $passenger->refresh();

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $ledger = app(LedgerService::class);

        $this->assertSame(
            '0.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '0.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '48.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );

        // Driver earns 752 and directly collects 300 cash.
        $this->assertSame(
            '452.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertSame(
            1,
            JournalEntry::where(
                'type',
                JournalEntry::TYPE_RIDE_SETTLEMENT
            )->count()
        );

        $this->assertLedgerBalances();
    }

    public function test_credit_can_cover_the_full_ride_without_gateway_attempt(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
        ]);

        $admin = $this->makeUser(
            User::ROLE_ADMIN,
            '0770000001'
        );
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '500.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'credit-only-award',
        );

        // No saved card is created. A gateway attempt must not be needed.
        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            500,
            'card',
            ['use_wallet_credit' => true]
        );

        Sanctum::actingAs(
            $passengerUser,
            ['role:passenger']
        );

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'credit-only-payment-1']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED')
            ->assertJsonPath('data.gateway', null);

        $payment = Payment::where(
            'ride_id',
            $ride->id
        )->sole();

        $this->assertSame(0, $payment->attempts()->count());
        $this->assertSame(1, $payment->allocations()->count());

        $allocation = $payment->allocations()->sole();

        $this->assertSame(
            PaymentAllocation::TYPE_PICKU_CREDIT,
            $allocation->type
        );
        $this->assertSame('500.00', $allocation->amount);
        $this->assertSame(
            PaymentAllocation::STATUS_COMPLETED,
            $allocation->status
        );

        $passenger->refresh();

        $this->assertSame('0.00', $passenger->wallet_balance);
        $this->assertSame(
            '0.00',
            $passenger->wallet_reserved_balance
        );

        $ledger = app(LedgerService::class);

        $this->assertSame(
            '0.00',
            $ledger->balanceFor('PASSENGER_WALLET_LIABILITY')
        );
        $this->assertSame(
            '0.00',
            $ledger->balanceFor('GATEWAY_RECEIVABLE')
        );
        $this->assertSame(
            '30.00',
            $ledger->balanceFor('REVENUE_COMMISSION')
        );
        $this->assertSame(
            '470.00',
            $ledger->balanceFor("DRIVER:{$driver->id}")
        );

        $this->assertLedgerBalances();
    }
}
