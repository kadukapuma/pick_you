<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\DriverAccount;
use App\Models\JournalLine;
use App\Models\LedgerAccount;
use App\Models\Ride;
use App\Services\Ledger\DriverPayoutService;
use App\Services\Ledger\DriverSettlementService;
use App\Services\Ledger\Money;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminFinanceController extends Controller
{
    use ApiResponse;

    /** Headline finance numbers for the admin dashboard. */
    public function summary(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
        ]);

        $period = $validated['period'] ?? 'month';
        $since = match ($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };

        $ridesQuery = Ride::query()->where('status', 'COMPLETED');

        if ($since) {
            $ridesQuery->where('completed_at', '>=', $since);
        }

        $rides = (clone $ridesQuery)->get([
            'final_fare', 'estimated_fare', 'commission_amount', 'driver_earning', 'payment_method',
        ]);

        $gross = '0.00';
        $commission = '0.00';
        $driverEarnings = '0.00';
        $cashRides = 0;
        $cardRides = 0;

        foreach ($rides as $ride) {
            $rideGross = Money::isZero(Money::of($ride->final_fare))
                ? Money::of($ride->estimated_fare)
                : Money::of($ride->final_fare);

            $gross = Money::add($gross, $rideGross);
            $commission = Money::add($commission, Money::of($ride->commission_amount));
            $driverEarnings = Money::add(
                $driverEarnings,
                $ride->driver_earning === null ? $rideGross : Money::of($ride->driver_earning),
            );

            ($ride->payment_method ?: 'cash') === 'cash' ? $cashRides++ : $cardRides++;
        }

        // Split the outstanding driver position into what PickU owes out and what
        // it is owed back - netting them would hide both.
        $positions = LedgerAccount::query()
            ->where('code', 'like', 'DRIVER:%')
            ->pluck('balance');

        $owedToDrivers = '0.00';
        $owedByDrivers = '0.00';

        foreach ($positions as $balance) {
            $value = Money::of($balance);

            if (Money::isNegative($value)) {
                $owedByDrivers = Money::add($owedByDrivers, Money::negate($value));
            } else {
                $owedToDrivers = Money::add($owedToDrivers, $value);
            }
        }

        return $this->success([
            'period' => $period,
            'since' => $since?->toDateTimeString(),
            'ride_count' => $rides->count(),
            'cash_rides' => $cashRides,
            'card_rides' => $cardRides,
            'gross_fares' => $gross,
            'commission_revenue' => $commission,
            'driver_earnings' => $driverEarnings,
            'owed_to_drivers' => $owedToDrivers,
            'owed_by_drivers' => $owedByDrivers,
            'lifetime_commission' => Money::of(
                LedgerAccount::where('code', 'REVENUE_COMMISSION')->value('balance') ?? 0
            ),
        ], 'Finance summary retrieved successfully.');
    }

    /** Every driver's current position, for the settlement worklist. */
    public function driverAccounts(Request $request)
    {
        $validated = $request->validate([
            'filter' => 'sometimes|in:all,owing,owed,blocked',
            'search' => 'sometimes|string|max:100',
        ]);

        $filter = $validated['filter'] ?? 'all';
        $search = $validated['search'] ?? null;

        $query = DriverAccount::query()
            ->join('ledger_accounts', 'ledger_accounts.id', '=', 'driver_accounts.ledger_account_id')
            ->join('drivers', 'drivers.id', '=', 'driver_accounts.driver_id')
            ->join('users', 'users.id', '=', 'drivers.user_id')
            ->select([
                'driver_accounts.id',
                'driver_accounts.driver_id',
                'driver_accounts.credit_limit',
                'driver_accounts.is_blocked',
                'driver_accounts.block_reason',
                'driver_accounts.commission_rate',
                'ledger_accounts.balance',
                'users.first_name',
                'users.last_name',
                'users.phone',
            ]);

        match ($filter) {
            'owing' => $query->where('ledger_accounts.balance', '<', 0),
            'owed' => $query->where('ledger_accounts.balance', '>', 0),
            'blocked' => $query->where('driver_accounts.is_blocked', true),
            default => null,
        };

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderBy('ledger_accounts.balance')->paginate(50);

        $accounts->getCollection()->transform(function ($row) {
            $balance = Money::of($row->balance);

            return [
                'driver_id' => $row->driver_id,
                'name' => trim($row->first_name.' '.$row->last_name),
                'phone' => $row->phone,
                'balance' => $balance,
                'status' => match (true) {
                    Money::isZero($balance) => 'SETTLED',
                    Money::isNegative($balance) => 'OWING',
                    default => 'OWED',
                },
                'credit_limit' => Money::of($row->credit_limit),
                'over_credit_limit' => Money::cmp($balance, Money::of($row->credit_limit)) < 0,
                'is_blocked' => (bool) $row->is_blocked,
                'block_reason' => $row->block_reason,
                'commission_rate' => $row->commission_rate,
            ];
        });

        return $this->success($accounts, 'Driver accounts retrieved successfully.');
    }

    /** Full ledger statement for one driver. */
    public function driverStatement(Request $request, $driverId)
    {
        $driver = Driver::with('user')->find($driverId);

        if (! $driver) {
            return $this->error('Driver not found.', 404);
        }

        $account = DriverAccount::forDriver((int) $driver->id)->load('ledgerAccount');

        $lines = JournalLine::query()
            ->where('ledger_account_id', $account->ledger_account_id)
            ->with('entry:id,type,description,posted_at,gateway')
            ->orderByDesc('id')
            ->paginate(50);

        $lines->getCollection()->transform(fn (JournalLine $line) => [
            'id' => $line->id,
            'amount' => Money::sub((string) $line->credit, (string) $line->debit),
            'debit' => Money::of($line->debit),
            'credit' => Money::of($line->credit),
            'balance_after' => Money::of($line->balance_after),
            'type' => $line->entry?->type,
            'description' => $line->entry?->description,
            'gateway' => $line->entry?->gateway,
            'posted_at' => optional($line->entry?->posted_at)?->toDateTimeString(),
        ]);

        return $this->success([
            'driver' => [
                'id' => $driver->id,
                'name' => trim(($driver->user?->first_name ?? '').' '.($driver->user?->last_name ?? '')),
                'phone' => $driver->user?->phone,
                'bank_name' => $driver->bank_name,
                'bank_branch' => $driver->bank_branch,
                'account_name' => $driver->account_name,
                'account_number' => $driver->account_number,
            ],
            'account' => [
                'balance' => $account->balance(),
                'credit_limit' => Money::of($account->credit_limit),
                'is_blocked' => $account->is_blocked,
                'block_reason' => $account->block_reason,
                'commission_rate' => $account->commission_rate,
                'over_credit_limit' => $account->isOverCreditLimit(),
            ],
            'transactions' => $lines,
        ], 'Driver statement retrieved successfully.');
    }

    /**
     * Record a driver's commission debt payment that happened outside the app.
     *
     * An operator verifies a WhatsApp receipt for a bank transfer / mobile
     * money payment, then enters it here. This posts a balanced journal entry
     * so the driver's ledger position - not just a status flag - reflects it.
     */
    public function settleDriver(Request $request, $driverId, DriverSettlementService $settlements)
    {
        $driver = Driver::find($driverId);

        if (! $driver) {
            return $this->error('Driver not found.', 404);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:1000000',
            'note' => 'required|string|max:500',
        ]);

        $idempotencyKey = trim((string) $request->header('Idempotency-Key'));
        $reference = sprintf('%d:%d:%s', $request->user()->id, $driver->id, $idempotencyKey);

        $entry = $settlements->record(
            driver: $driver,
            amount: (string) $validated['amount'],
            note: $validated['note'],
            createdBy: $request->user(),
            reference: $reference,
        );

        $account = DriverAccount::forDriver((int) $driver->id)->load('ledgerAccount');
        $balance = $account->balance();

        return $this->success([
            'driver_id' => $driver->id,
            'balance' => $balance,
            'status' => match (true) {
                Money::isZero($balance) => 'SETTLED',
                Money::isNegative($balance) => 'OWING',
                default => 'OWED',
            },
            'entry_id' => $entry->id,
        ], 'Driver settlement recorded successfully.', 201);
    }

    /**
     * Record PickU paying a driver out - the reverse of settleDriver().
     *
     * An operator sends a bank transfer for what PickU owes the driver (e.g.
     * accumulated card/wallet earnings), then enters it here. This posts a
     * balanced journal entry and is capped at what is actually owed.
     */
    public function payoutDriver(Request $request, $driverId, DriverPayoutService $payouts)
    {
        $driver = Driver::find($driverId);

        if (! $driver) {
            return $this->error('Driver not found.', 404);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:1000000',
            'note' => 'required|string|max:500',
        ]);

        $idempotencyKey = trim((string) $request->header('Idempotency-Key'));
        $reference = sprintf('%d:%d:%s', $request->user()->id, $driver->id, $idempotencyKey);

        try {
            $entry = $payouts->record(
                driver: $driver,
                amount: (string) $validated['amount'],
                note: $validated['note'],
                createdBy: $request->user(),
                reference: $reference,
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        }

        $account = DriverAccount::forDriver((int) $driver->id)->load('ledgerAccount');
        $balance = $account->balance();

        return $this->success([
            'driver_id' => $driver->id,
            'balance' => $balance,
            'status' => match (true) {
                Money::isZero($balance) => 'SETTLED',
                Money::isNegative($balance) => 'OWING',
                default => 'OWED',
            },
            'entry_id' => $entry->id,
        ], 'Driver payout recorded successfully.', 201);
    }

    /**
     * Proof that the books balance. Balances are stored credit-positive for every
     * account type, so a healthy ledger sums to exactly zero.
     */
    public function trialBalance()
    {
        $accounts = LedgerAccount::query()->orderBy('code')->get();

        $total = '0.00';
        $rows = [];

        foreach ($accounts as $account) {
            $total = Money::add($total, Money::of($account->balance));

            $rows[] = [
                'code' => $account->code,
                'type' => $account->type,
                'balance' => Money::of($account->balance),
                'natural_balance' => $account->naturalBalance(),
            ];
        }

        // Independently recompute from the immutable lines, so a drifted cached
        // balance is caught rather than trusted.
        $lineTotals = DB::table('journal_lines')
            ->selectRaw('SUM(debit) as debits, SUM(credit) as credits')
            ->first();

        $debits = Money::of($lineTotals->debits ?? 0);
        $credits = Money::of($lineTotals->credits ?? 0);

        return $this->success([
            'accounts' => $rows,
            'balance_total' => $total,
            'total_debits' => $debits,
            'total_credits' => $credits,
            'balanced' => Money::isZero($total) && Money::cmp($debits, $credits) === 0,
        ], 'Trial balance retrieved successfully.');
    }
}
