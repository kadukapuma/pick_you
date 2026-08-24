<?php

namespace Tests\Feature;

use App\Models\JournalEntry;
use App\Models\LoyaltyPointTransaction;
use App\Models\Passenger;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\Ledger\LedgerService;
use App\Services\Ledger\RideSettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\BuildsLedgerScenarios;
use Tests\TestCase;

class LoyaltyPointsAccrualTest extends TestCase
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

    private function verifyStudent(Passenger $passenger): void
    {
        $passenger->studentVerification()->create([
            'university_name' => 'Test University',
            'card_front_path' => 'student-cards/front.jpg',
            'card_back_path' => 'student-cards/back.jpg',
            'status' => 'approved',
        ]);
    }

    public function test_general_accrual_credits_points_and_posts_a_ledger_entry(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(['loyalty_points_rate' => '0.5000']);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        // Commission is 6% of 1000 = 60. Loyalty rate is 50% of that = 30.
        $passenger->refresh();
        $this->assertSame('30.00', (string) $passenger->loyalty_points_balance);

        $transaction = LoyaltyPointTransaction::where('passenger_id', $passenger->id)->sole();
        $this->assertSame('30.00', (string) $transaction->points);
        $this->assertSame(LoyaltyPointTransaction::TYPE_EARNED, $transaction->type);
        $this->assertSame(LoyaltyPointTransaction::SOURCE_GENERAL_ACCRUAL, $transaction->source);

        $ledger = app(LedgerService::class);
        $this->assertSame('30.00', $ledger->balanceFor('PASSENGER_LOYALTY_LIABILITY'));
        // Commission revenue is reduced by the points given away.
        $this->assertSame('30.00', $ledger->balanceFor('REVENUE_COMMISSION'));
        $this->assertLedgerBalances();
    }

    public function test_unconfigured_vehicle_type_accrues_no_points(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(); // loyalty_points_rate left null
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        $passenger->refresh();
        $this->assertSame('0.00', (string) $passenger->loyalty_points_balance);
        $this->assertSame(0, LoyaltyPointTransaction::count());
        $this->assertSame('0.00', app(LedgerService::class)->balanceFor('PASSENGER_LOYALTY_LIABILITY'));
        $this->assertLedgerBalances();
    }

    public function test_global_setting_is_used_when_vehicle_type_rate_is_unset(): void
    {
        Setting::setSetting('loyalty_points_rate', '0.2000');

        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig();
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        // 60 commission * 20% = 12.
        $this->assertSame('12.00', (string) $passenger->refresh()->loyalty_points_balance);
        $this->assertLedgerBalances();
    }

    public function test_verified_student_stacks_both_accrual_paths(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $this->verifyStudent($passenger);

        $fare = $this->makeFareConfig([
            'student_commission_rate' => '0.0500',
            'loyalty_points_rate' => '0.5000',
        ]);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        // Student commission is 5% of 1000 = 50.
        // Student bonus (existing mechanism): 100% of that = 50.
        // General accrual (new): 50% of that same 50 = 25.
        $passenger->refresh();
        $this->assertSame('75.00', (string) $passenger->loyalty_points_balance);

        $transactions = LoyaltyPointTransaction::where('passenger_id', $passenger->id)
            ->orderBy('source')
            ->get();
        $this->assertCount(2, $transactions);

        $general = $transactions->firstWhere('source', LoyaltyPointTransaction::SOURCE_GENERAL_ACCRUAL);
        $this->assertSame('25.00', (string) $general->points);

        $studentBonus = $transactions->firstWhere('source', LoyaltyPointTransaction::SOURCE_STUDENT_BONUS);
        $this->assertSame('50.00', (string) $studentBonus->points);

        // Only the general accrual is ledger-backed - the student bonus stays
        // off-ledger, a known asymmetry between the two paths.
        $this->assertSame('25.00', app(LedgerService::class)->balanceFor('PASSENGER_LOYALTY_LIABILITY'));
        $this->assertLedgerBalances();
    }

    public function test_non_student_only_gets_the_general_accrual_row(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig([
            'student_commission_rate' => '0.0500',
            'loyalty_points_rate' => '0.5000',
        ]);
        $ride = $this->makeCompletedRide($passenger, $driver, $fare, 1000, 'cash');

        $this->settle($ride->id, 'cash', 1000);

        $transaction = LoyaltyPointTransaction::where('passenger_id', $passenger->id)->sole();
        $this->assertSame(LoyaltyPointTransaction::SOURCE_GENERAL_ACCRUAL, $transaction->source);
    }

    public function test_double_settle_does_not_double_credit_points(): void
    {
        [, $driver] = $this->makeDriver();
        [, $passenger] = $this->makePassenger();
        $fare = $this->makeFareConfig(['loyalty_points_rate' => '0.5000']);
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
        $this->assertSame('30.00', (string) $passenger->refresh()->loyalty_points_balance);
        $this->assertSame(1, LoyaltyPointTransaction::count());
        $this->assertLedgerBalances();
    }
}
