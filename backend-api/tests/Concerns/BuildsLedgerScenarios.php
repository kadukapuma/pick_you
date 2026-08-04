<?php

namespace Tests\Concerns;

use App\Models\Driver;
use App\Models\FareConfig;
use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use App\Models\Ride;
use App\Models\User;
use App\Services\Payments\MockPaymentGateway;

trait BuildsLedgerScenarios
{
    /** @return array{0: User, 1: Driver} */
    protected function makeDriver(string $phone = '0777654321'): array
    {
        $user = $this->makeUser(User::ROLE_DRIVER, $phone);
        $driver = $user->driver()->create(['status' => 'approved', 'availability' => 1]);
        $user->ensureRole(User::ROLE_DRIVER);

        return [$user, $driver];
    }

    /** @return array{0: User, 1: Passenger} */
    protected function makePassenger(string $phone = '0771234567'): array
    {
        $user = $this->makeUser(User::ROLE_PASSENGER, $phone);
        $passenger = $user->passenger()->create(['wallet_balance' => 10000]);
        $user->ensureRole(User::ROLE_PASSENGER);

        return [$user, $passenger];
    }

    protected function makeUser(string $role, string $phone): User
    {
        return User::create([
            'first_name' => 'Test',
            'last_name' => 'Person',
            'email' => uniqid('', true).'@example.com',
            'phone' => $phone,
            'phone_normalized' => $phone,
            'password' => 'password',
            'role' => $role,
            'is_active' => true,
            'is_verified' => true,
        ]);
    }

    protected function makeFareConfig(array $overrides = []): FareConfig
    {
        return FareConfig::create([
            'vehicle_type' => uniqid('car'),
            'base_fare' => 50,
            'per_km_rate' => 100,
            'per_minute_rate' => 10,
            'cancellation_fee' => 50,
            'is_active' => true,
            ...$overrides,
        ]);
    }

    protected function makeCompletedRide(
        Passenger $passenger,
        Driver $driver,
        FareConfig $fare,
        float $finalFare,
        string $paymentMethod = 'cash',
        array $overrides = [],
    ): Ride {
        return Ride::create([
            'ride_code' => uniqid('RIDE'),
            'passenger_id' => $passenger->id,
            'driver_id' => $driver->id,
            'fare_id' => $fare->id,
            'pickup_address' => 'Pickup',
            'drop_address' => 'Drop',
            'distance_km' => 5,
            'estimated_distance_km' => 5,
            'estimated_duration_minutes' => 10,
            'estimated_fare' => $finalFare,
            'final_fare' => $finalFare,
            'payment_method' => $paymentMethod,
            'status' => 'COMPLETED',
            'requested_at' => now()->subMinutes(40),
            'accepted_at' => now()->subMinutes(35),
            'arrived_at' => now()->subMinutes(30),
            'started_at' => now()->subMinutes(25),
            'completed_at' => now()->subMinute(),
            ...$overrides,
        ]);
    }

    protected function makeCard(Passenger $passenger, string $number = MockPaymentGateway::CARD_SUCCESS): PassengerPaymentMethod
    {
        return PassengerPaymentMethod::create([
            'passenger_id' => $passenger->id,
            'gateway' => MockPaymentGateway::NAME,
            'token' => 'tok_mock_'.uniqid(),
            'brand' => 'visa',
            'last4' => substr($number, -4),
            'exp_month' => 12,
            'exp_year' => (int) now()->addYear()->year,
            'is_default' => true,
        ]);
    }

    /**
     * The invariant that makes the books trustworthy: with balances stored
     * credit-positive for every account type, they must sum to exactly zero.
     */
    protected function assertLedgerBalances(): void
    {
        $sum = \App\Models\LedgerAccount::query()
            ->get()
            ->reduce(fn ($carry, $account) => bcadd($carry, (string) $account->balance, 2), '0.00');

        $this->assertSame('0.00', $sum, 'Ledger does not balance: account balances sum to '.$sum);

        $entries = \App\Models\JournalEntry::with('lines')->get();

        foreach ($entries as $entry) {
            $debits = $entry->lines->reduce(fn ($c, $l) => bcadd($c, (string) $l->debit, 2), '0.00');
            $credits = $entry->lines->reduce(fn ($c, $l) => bcadd($c, (string) $l->credit, 2), '0.00');

            $this->assertSame($debits, $credits, "Entry {$entry->id} does not balance.");
        }

        // Cached balances must match the lines they were derived from.
        foreach (\App\Models\LedgerAccount::all() as $account) {
            $computed = \App\Models\JournalLine::where('ledger_account_id', $account->id)
                ->get()
                ->reduce(fn ($c, $l) => bcsub(bcadd($c, (string) $l->credit, 2), (string) $l->debit, 2), '0.00');

            $this->assertSame(
                bcadd((string) $account->balance, '0', 2),
                $computed,
                "Cached balance for {$account->code} has drifted from its lines.",
            );
        }
    }
}
