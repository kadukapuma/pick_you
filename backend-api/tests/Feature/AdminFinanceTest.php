<?php

namespace Tests\Feature;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\Payment;
use App\Models\User;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class AdminFinanceTest extends TestCase
{
    use BuildsLedgerScenarios, RefreshDatabase;

    private function actingAsAdmin(): User
    {
        $admin = $this->makeUser(User::ROLE_ADMIN, '0770000001');
        $admin->ensureRole(User::ROLE_ADMIN);

        Sanctum::actingAs($admin, ['role:admin']);

        return $admin;
    }

    private function settledRide(string $method, float $amount, ?object $driver = null): void
    {
        [, $driver] = $driver ? [null, $driver] : $this->makeDriver('077'.random_int(1000000, 9999999));
        [, $passenger] = $this->makePassenger('077'.random_int(1000000, 9999999));
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, $amount, $method);

        $payment = Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $passenger->id,
            'payment_method' => $method,
            'amount' => $amount,
            'transaction_id' => 'txn_'.uniqid(),
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
            'gateway' => $method === 'card' ? 'mock' : null,
        ]);

        app(RideSettlementService::class)->settle($payment);
    }

    public function test_summary_reports_commission_and_both_driver_positions(): void
    {
        $this->settledRide('cash', 1000);   // driver owes 60
        $this->settledRide('card', 2000);   // driver owed 1880

        $this->actingAsAdmin();

        $this->getJson('/api/admin/finance/summary?period=month')
            ->assertOk()
            ->assertJsonPath('data.ride_count', 2)
            ->assertJsonPath('data.cash_rides', 1)
            ->assertJsonPath('data.card_rides', 1)
            ->assertJsonPath('data.gross_fares', '3000.00')
            ->assertJsonPath('data.commission_revenue', '180.00')
            ->assertJsonPath('data.driver_earnings', '2820.00')
            // Reported separately: netting them would hide both obligations.
            ->assertJsonPath('data.owed_to_drivers', '1880.00')
            ->assertJsonPath('data.owed_by_drivers', '60.00');
    }

    public function test_driver_accounts_can_be_filtered_by_position(): void
    {
        $this->settledRide('cash', 1000);
        $this->settledRide('card', 2000);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/finance/driver-accounts?filter=owing')
            ->assertOk()
            ->assertJsonPath('data.data.0.status', 'OWING')
            ->assertJsonPath('data.data.0.balance', '-60.00')
            ->assertJsonCount(1, 'data.data');

        $this->getJson('/api/admin/finance/driver-accounts?filter=owed')
            ->assertOk()
            ->assertJsonPath('data.data.0.status', 'OWED')
            ->assertJsonPath('data.data.0.balance', '1880.00');
    }

    public function test_driver_statement_lists_ledger_lines_and_bank_details(): void
    {
        [, $driver] = $this->makeDriver();
        $driver->update([
            'bank_name' => 'Sampath',
            'bank_branch' => 'Kandy',
            'account_name' => 'Test Person',
            'account_number' => '1234567890',
        ]);

        $this->settledRide('cash', 1000, $driver);
        $this->actingAsAdmin();

        $this->getJson("/api/admin/finance/drivers/{$driver->id}/statement")
            ->assertOk()
            ->assertJsonPath('data.account.balance', '-60.00')
            ->assertJsonPath('data.driver.bank_name', 'Sampath')
            ->assertJsonPath('data.transactions.data.0.amount', '-60.00')
            ->assertJsonPath('data.transactions.data.0.type', JournalEntry::TYPE_RIDE_SETTLEMENT);
    }

    public function test_trial_balance_confirms_the_books_balance(): void
    {
        $this->settledRide('cash', 1000);
        $this->settledRide('card', 2000);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/finance/trial-balance')
            ->assertOk()
            ->assertJsonPath('data.balanced', true)
            ->assertJsonPath('data.balance_total', '0.00')
            // 60 from the cash ride (commission only) + 2000 from the card ride
            // (the full gross passes through PickU).
            ->assertJsonPath('data.total_debits', '2060.00')
            ->assertJsonPath('data.total_credits', '2060.00');
    }

    public function test_trial_balance_reports_unbalanced_when_a_cached_balance_drifts(): void
    {
        $this->settledRide('cash', 1000);

        // Simulate corruption that bypassed LedgerService.
        \App\Models\LedgerAccount::where('code', 'REVENUE_COMMISSION')->update(['balance' => 999]);

        $this->actingAsAdmin();

        $this->getJson('/api/admin/finance/trial-balance')
            ->assertOk()
            ->assertJsonPath('data.balanced', false);
    }

    public function test_finance_endpoints_are_closed_to_drivers(): void
    {
        [$driverUser] = $this->makeDriver();
        Sanctum::actingAs($driverUser, ['role:driver']);

        $this->getJson('/api/admin/finance/summary')->assertStatus(403);
        $this->getJson('/api/admin/finance/trial-balance')->assertStatus(403);
    }

    public function test_earnings_summary_returns_chart_buckets(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        $this->settledRide('cash', 1000, $driver);

        Sanctum::actingAs($driverUser, ['role:driver']);

        $response = $this->getJson('/api/driver/earnings/summary?period=week')
            ->assertOk()
            ->assertJsonPath('data.net', '940.00')
            ->assertJsonPath('data.average_per_trip', '940.00');

        // One bucket per weekday, pre-seeded so the chart keeps a stable shape.
        $this->assertCount(7, $response->json('data.chart'));
    }

    /**
     * The app's default period. Hour labels like "12" are coerced to integer
     * array keys by PHP, so the bucket labels must survive that.
     */
    public function test_earnings_summary_works_for_every_period(): void
    {
        [$driverUser, $driver] = $this->makeDriver();
        $this->settledRide('cash', 1000, $driver);

        Sanctum::actingAs($driverUser, ['role:driver']);

        foreach (['day', 'week', 'month'] as $period) {
            $response = $this->getJson("/api/driver/earnings/summary?period={$period}")
                ->assertOk();

            foreach ($response->json('data.chart') as $bucket) {
                $this->assertIsString($bucket['label'], "Bucket label must be a string for period {$period}.");
            }
        }

        // No period at all is what the driver app sends first.
        $this->getJson('/api/driver/earnings/summary')->assertOk();
    }

    public function test_credit_limit_blocks_ride_acceptance_via_the_api(): void
    {
        [, $driver] = $this->makeDriver();
        DriverAccount::forDriver((int) $driver->id)->update(['credit_limit' => '-50']);

        app(LedgerService::class)->post(
            JournalEntry::TYPE_ADJUSTMENT,
            'test:overlimit',
            'Accrued commission',
            [
                ['account' => "DRIVER:{$driver->id}", 'debit' => '200.00'],
                ['account' => 'REVENUE_COMMISSION', 'credit' => '200.00'],
            ],
        );

        $this->actingAsAdmin();

        $this->getJson('/api/admin/finance/driver-accounts?filter=all')
            ->assertOk()
            ->assertJsonPath('data.data.0.over_credit_limit', true);
    }
}
