<?php

namespace Tests\Feature;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class CommissionSettlementTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function settle(int $rideId, string $method, float $amount, ?string $gateway = null): ?JournalEntry
    {
        $payment = Payment::create([
            'ride_id' => $rideId,
            'passenger_id' => \App\Models\Ride::find($rideId)->passenger_id,
            'payment_method' => $method,
            'amount' => $amount,
            'transaction_id' => 'txn_'.uniqid(),
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
            'gateway' => $gateway,
        ]);

        return app(RideSettlementService::class)->settle($payment);
    }

    public function test_cash_ride_makes_the_driver_owe_only_the_commission(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        $ledger = app(LedgerService::class);

        // Driver holds the full 1000 cash, so they owe PickU the 6%.
        $this->assertSame('-60.00', $ledger->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame('60.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        // The gross never entered PickU's custody, so it stays out of the books.
        $this->assertSame('0.00', $ledger->balanceFor('GATEWAY_RECEIVABLE'));
        $this->assertLedgerBalances();
    }

    public function test_card_ride_credits_the_driver_their_share(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');

        $this->settle($ride->id, 'card', 2000, 'mock');

        $ledger = app(LedgerService::class);

        $this->assertSame('1880.00', $ledger->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame('120.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        $this->assertSame('-2000.00', $ledger->balanceFor('GATEWAY_RECEIVABLE'));
        $this->assertLedgerBalances();
    }

    /** The behaviour this whole feature exists for. */
    public function test_cash_debt_is_absorbed_by_a_later_card_ride(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();

        $cashRide = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');
        $this->settle($cashRide->id, 'cash', 1000);

        $ledger = app(LedgerService::class);
        $this->assertSame('-60.00', $ledger->balanceFor("DRIVER:{$driver->id}"));

        $cardRide = $this->makeCompletedRide($passenger, $driver, $fare, 2000, 'card');
        $this->settle($cardRide->id, 'card', 2000, 'mock');

        // -60 + 1880: the driver never had to make a separate top-up.
        $this->assertSame('1820.00', $ledger->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame('180.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        $this->assertLedgerBalances();
    }

    public function test_settlement_is_idempotent_per_ride(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => 'cash',
            'amount' => 1000,
            'transaction_id' => 'txn_'.uniqid(),
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
        ]);

        $service = app(RideSettlementService::class);
        $first = $service->settle($payment);
        $second = $service->settle($payment);

        $this->assertSame($first->id, $second->id);
        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        $this->assertLedgerBalances();
    }

    public function test_commission_snapshot_is_written_to_the_ride(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);
        $ride->refresh();

        $this->assertSame('0.0600', (string) $ride->commission_rate);
        $this->assertSame('60.00', (string) $ride->commission_amount);
        $this->assertSame('940.00', (string) $ride->driver_earning);
    }

    public function test_rate_change_does_not_rewrite_history(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        Setting::setSetting('commission_rate', '0.15');

        $ride->refresh();
        $this->assertSame('60.00', (string) $ride->commission_amount);
        $this->assertSame('-60.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_per_vehicle_type_rate_overrides_the_global_rate(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(['commission_rate' => '0.1000']);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        $this->assertSame('-100.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_per_driver_rate_overrides_the_vehicle_type_rate(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(['commission_rate' => '0.1000']);

        DriverAccount::forDriver((int) $driver->id)->update(['commission_rate' => '0.0300']);

        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');
        $this->settle($ride->id, 'cash', 1000);

        $this->assertSame('-30.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
    }

    public function test_rides_completed_before_the_cutoff_are_not_charged(): void
    {
        Setting::setSetting('commission_effective_from', now()->toDateTimeString());

        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash', [
            'completed_at' => now()->subWeek(),
        ]);

        $entry = $this->settle($ride->id, 'cash', 1000);

        $this->assertNull($entry);
        $this->assertSame('0.00', app(LedgerService::class)->balanceFor("DRIVER:{$driver->id}"));
        // NULL, not 0.00, so pre-cutoff rides stay distinguishable in reporting.
        $this->assertNull($ride->refresh()->commission_amount);
    }

    public function test_rounding_never_loses_a_cent(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        // 333.33 * 0.06 = 19.9998 -> 20.00, driver gets 313.33
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 333.33, 'card');

        $this->settle($ride->id, 'card', 333.33, 'mock');
        $ride->refresh();

        $this->assertSame('20.00', (string) $ride->commission_amount);
        $this->assertSame('313.33', (string) $ride->driver_earning);
        $this->assertLedgerBalances();
    }

    public function test_wallet_payment_settles_against_the_wallet_liability(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 500, 'wallet');

        $this->settle($ride->id, 'wallet', 500);

        $ledger = app(LedgerService::class);
        $this->assertSame('470.00', $ledger->balanceFor("DRIVER:{$driver->id}"));
        $this->assertSame('-500.00', $ledger->balanceFor('PASSENGER_WALLET_LIABILITY'));
        $this->assertLedgerBalances();
    }
}
