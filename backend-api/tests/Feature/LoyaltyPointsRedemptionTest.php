<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\LoyaltyPointTransaction;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\User;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use App\Services\Payments\LoyaltyPointsService;
use App\Services\Payments\MockPaymentGateway;
use App\Services\Payments\PassengerCreditService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class LoyaltyPointsRedemptionTest extends TestCase
{
    use BuildsLedgerScenarios;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['payments.driver' => 'mock']);
    }

    // --- LoyaltyPointsService reserve/release/consume lifecycle ---

    public function test_points_can_be_reserved_once_for_a_payment(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '200.00']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 800, 'card');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'loyalty-reserve-1',
            'payment_status' => 'PENDING',
        ]);

        $service = app(LoyaltyPointsService::class);

        $first = $service->reserve($payment, '800.00', 'ref-1');
        $second = $service->reserve($payment, '800.00', 'ref-1');

        $this->assertSame($first->id, $second->id);
        $this->assertSame('200.00', (string) $first->amount);
        $this->assertSame(PaymentAllocation::STATUS_RESERVED, $first->status);

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('200.00', (string) $passenger->loyalty_points_reserved_balance);
    }

    public function test_reservation_caps_at_available_points(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '50.00']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 800, 'card');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'loyalty-reserve-cap-1',
            'payment_status' => 'PENDING',
        ]);

        $allocation = app(LoyaltyPointsService::class)->reserve($payment, '800.00', 'ref-cap-1');

        $this->assertSame('50.00', (string) $allocation->amount);
        $this->assertSame('0.00', (string) $passenger->refresh()->loyalty_points_balance);
    }

    public function test_reserved_points_are_released_once_after_failure(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '100.00']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 800, 'card');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'loyalty-release-1',
            'payment_status' => 'PENDING',
        ]);

        $service = app(LoyaltyPointsService::class);
        $allocation = $service->reserve($payment, '800.00', 'ref-release-1');

        $service->release($allocation, 'release-ref-1');
        $service->release($allocation, 'release-ref-1');

        $this->assertSame(PaymentAllocation::STATUS_RELEASED, $allocation->fresh()->status);
        $passenger->refresh();
        $this->assertSame('100.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_reserved_balance);
        $this->assertSame(0, LoyaltyPointTransaction::count());
    }

    public function test_reserved_points_are_consumed_once_after_success(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '100.00']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 800, 'card');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'loyalty-consume-1',
            'payment_status' => 'PENDING',
        ]);

        $service = app(LoyaltyPointsService::class);
        $allocation = $service->reserve($payment, '800.00', 'ref-consume-1');

        $service->consume($allocation, 'consume-ref-1');
        $service->consume($allocation, 'consume-ref-1');

        $this->assertSame(PaymentAllocation::STATUS_COMPLETED, $allocation->fresh()->status);
        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_reserved_balance);

        $transaction = LoyaltyPointTransaction::where('passenger_id', $passenger->id)
            ->where('type', LoyaltyPointTransaction::TYPE_REDEEMED)
            ->sole();
        $this->assertSame('100.00', (string) $transaction->points);
        $this->assertSame($payment->id, $transaction->payment_id);
    }

    public function test_consumed_points_cannot_be_released(): void
    {
        [, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '100.00']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 800, 'card');
        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'card',
            'amount' => '800.00',
            'transaction_id' => 'loyalty-consumed-release-1',
            'payment_status' => 'PENDING',
        ]);

        $service = app(LoyaltyPointsService::class);
        $allocation = $service->reserve($payment, '800.00', 'ref-x-1');
        $service->consume($allocation, 'consume-ref-x-1');

        $this->expectException(DomainException::class);
        $service->release($allocation->fresh(), 'release-ref-x-1');
    }

    // --- End-to-end payment flow ---

    public function test_points_can_cover_the_full_ride_without_gateway_attempt(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '500.00']);

        // No saved card is created. A gateway attempt must not be needed.
        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            500,
            'card',
            ['use_loyalty_points' => true]
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'loyalty-only-payment-1']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED')
            ->assertJsonPath('data.gateway', null);

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(0, $payment->attempts()->count());
        $allocation = $payment->allocations()->sole();
        $this->assertSame(PaymentAllocation::TYPE_LOYALTY_POINTS, $allocation->type);
        $this->assertSame('500.00', $allocation->amount);
        $this->assertSame(PaymentAllocation::STATUS_COMPLETED, $allocation->status);

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_reserved_balance);

        $ledger = app(LedgerService::class);
        // The 500 points were seeded directly onto the passenger, not
        // accrued through the ledger-backed accrual path, so redemption's
        // debit has no prior credit to net against.
        $this->assertSame('-500.00', $ledger->balanceFor('PASSENGER_LOYALTY_LIABILITY'));
        $this->assertSame('30.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        $this->assertSame('470.00', $ledger->balanceFor("DRIVER:{$driver->id}"));

        $ride->refresh();
        $this->assertSame('500.00', (string) $ride->loyalty_points_used);

        $this->assertLedgerBalances();
    }

    public function test_card_decline_releases_reserved_points(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();
        $passenger->update(['loyalty_points_balance' => '500.00']);

        $card = $this->makeCard($passenger, MockPaymentGateway::CARD_DECLINED);

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_loyalty_points' => true]
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'loyalty-decline-1']
        )->assertStatus(402);

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD => PaymentAllocation::STATUS_RELEASED,
                PaymentAllocation::TYPE_LOYALTY_POINTS => PaymentAllocation::STATUS_RELEASED,
            ],
            $payment->allocations()->orderBy('type')->pluck('status', 'type')->all()
        );

        $passenger->refresh();
        $this->assertSame('500.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_reserved_balance);

        // A retry with a working card reserves and consumes the points again.
        $card->update(['last4' => substr(MockPaymentGateway::CARD_SUCCESS, -4)]);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'loyalty-retry-1']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_reserved_balance);

        $this->assertLedgerBalances();
    }

    public function test_loyalty_points_only_claim_what_credit_leaves_behind(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
            // Both balances independently exceed the fare - without
            // sequencing, each would try to reserve up to the full 800 and
            // remainingAmount() would reject the payment as over-allocated.
            'loyalty_points_balance' => '800.00',
        ]);

        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000003');
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '800.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'sequencing-credit-award',
        );

        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'cash',
            ['use_wallet_credit' => true, 'use_loyalty_points' => true]
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'sequencing-payment-1']
        )
            ->assertOk()
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment = Payment::where('ride_id', $ride->id)->sole();

        // Credit alone covers the full fare, so loyalty points reserve
        // nothing - the two never together exceed what's owed.
        $this->assertSame(
            [PaymentAllocation::TYPE_PICKU_CREDIT => '800.00'],
            $payment->allocations()->pluck('amount', 'type')->all()
        );

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->wallet_balance);
        $this->assertSame('800.00', (string) $passenger->loyalty_points_balance);

        $this->assertLedgerBalances();
    }

    public function test_wallet_credit_and_loyalty_points_and_card_settle_together(): void
    {
        [$passengerUser, $passenger] = $this->makePassenger();
        [, $driver] = $this->makeDriver();
        $fare = $this->makeFareConfig();

        $passenger->update([
            'wallet_balance' => '0.00',
            'wallet_reserved_balance' => '0.00',
            'loyalty_points_balance' => '200.00',
        ]);

        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000002');
        $admin->ensureRole(User::ROLE_ADMIN);

        app(PassengerCreditService::class)->award(
            passenger: $passenger,
            amount: '300.00',
            createdBy: $admin,
            reason: 'System error compensation.',
            reference: 'three-way-credit-award',
        );

        $this->makeCard($passenger, MockPaymentGateway::CARD_SUCCESS);

        // Fare 800: 300 wallet credit + 200 loyalty points + 300 card remainder.
        $ride = $this->makeCompletedRide(
            $passenger,
            $driver,
            $fare,
            800,
            'card',
            ['use_wallet_credit' => true, 'use_loyalty_points' => true]
        );

        Sanctum::actingAs($passengerUser, ['role:passenger']);

        $this->postJson(
            "/api/payments/{$ride->id}",
            [],
            ['Idempotency-Key' => 'three-way-payment-1']
        )
            ->assertOk()
            ->assertJsonPath('data.amount', '800.00')
            ->assertJsonPath('data.payment_status', 'COMPLETED');

        $payment = Payment::where('ride_id', $ride->id)->sole();

        $this->assertSame(
            [
                PaymentAllocation::TYPE_CARD => '300.00',
                PaymentAllocation::TYPE_LOYALTY_POINTS => '200.00',
                PaymentAllocation::TYPE_PICKU_CREDIT => '300.00',
            ],
            $payment->allocations()->orderBy('type')->pluck('amount', 'type')->all()
        );

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->wallet_balance);
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);

        $ledger = app(LedgerService::class);
        // Credit award created +300 liability; settlement consumed it.
        $this->assertSame('0.00', $ledger->balanceFor('PASSENGER_WALLET_LIABILITY'));
        // The 200 points were seeded directly, not accrued through the
        // ledger, so redemption's debit has no prior credit to net against.
        $this->assertSame('-200.00', $ledger->balanceFor('PASSENGER_LOYALTY_LIABILITY'));
        $this->assertSame('-300.00', $ledger->balanceFor('GATEWAY_RECEIVABLE'));
        // Six percent of 800.
        $this->assertSame('48.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        $this->assertSame('752.00', $ledger->balanceFor("DRIVER:{$driver->id}"));

        $this->assertSame(
            1,
            JournalEntry::where('type', JournalEntry::TYPE_RIDE_SETTLEMENT)->count()
        );

        $ride->refresh();
        $this->assertSame('200.00', (string) $ride->loyalty_points_used);

        $this->assertLedgerBalances();
    }
}
