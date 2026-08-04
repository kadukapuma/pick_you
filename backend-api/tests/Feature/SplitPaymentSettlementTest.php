<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\PaymentAllocation;
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
}
