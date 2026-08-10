<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\Passenger;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\Vehicle;
use App\Services\Ledger\Money;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportsOverviewController extends Controller
{
    use ApiResponse;

    /** Headline stats + trend + top drivers, for the Reports dashboard. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
        ]);

        $period = $validated['period'] ?? 'week';
        $since = $this->sincePeriod($period);

        $ridesQuery = Ride::query()->where('status', 'COMPLETED');

        if ($since) {
            $ridesQuery->where('completed_at', '>=', $since);
        }

        $rides = (clone $ridesQuery)->get([
            'final_fare', 'estimated_fare', 'commission_amount', 'driver_earning',
        ]);

        $gross = '0.00';
        $commission = '0.00';
        $driverEarnings = '0.00';

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
        }

        return $this->success([
            'period' => $period,
            'since' => $since?->toDateTimeString(),
            'stats' => [
                'revenue' => $gross,
                'commission' => $commission,
                'driver_earnings' => $driverEarnings,
                'rides' => $rides->count(),
            ],
            'trend' => $this->trend(),
            'top_drivers' => $this->topDrivers($since),
            'recent_transactions' => $this->recentTransactions(),
        ], 'Reports overview retrieved successfully.');
    }

    /** Ride counts by status, optionally scoped to one vehicle type. */
    public function rideStatistics(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
            'vehicle_type' => 'sometimes|integer|exists:vehicle_types,id',
        ]);

        $period = $validated['period'] ?? 'week';
        $since = $this->sincePeriod($period);
        $vehicleTypeId = $validated['vehicle_type'] ?? null;

        // Each status is filtered by the timestamp that actually falls in "this
        // period" for that status - a ride requested last month but cancelled
        // today belongs in today's cancelled count, not last month's, so a
        // single blanket requested_at filter across all statuses (the previous
        // approach) misattributes cancellations to the wrong period.
        $countFor = function (string $status, string $dateColumn) use ($since, $vehicleTypeId) {
            $query = Ride::query()->where('status', $status);

            if ($since) {
                $query->where($dateColumn, '>=', $since);
            }

            if ($vehicleTypeId) {
                $query->whereHas('vehicle', fn ($q) => $q->where('vehicle_type_id', $vehicleTypeId));
            }

            return $query->count();
        };

        $ongoing = collect(['ACCEPTED', 'ARRIVED', 'STARTED'])
            ->sum(fn ($status) => $countFor($status, 'requested_at'));

        return $this->success([
            'period' => $period,
            'completed' => $countFor('COMPLETED', 'completed_at'),
            'cancelled' => $countFor('CANCELLED', 'cancelled_at'),
            // ACCEPTED/ARRIVED/STARTED have no terminal timestamp yet, so
            // requested_at is the only meaningful date column for them.
            'ongoing' => $ongoing,
            'requested' => $countFor('REQUESTED', 'requested_at'),
        ], 'Ride statistics retrieved successfully.');
    }

    /** Payment method split, optionally scoped to a payment status. */
    public function paymentBreakdown(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
            'status' => 'sometimes|in:all,success,pending',
        ]);

        $period = $validated['period'] ?? 'week';
        $since = $this->sincePeriod($period);
        $status = $validated['status'] ?? 'all';

        $query = Payment::query();

        if ($since) {
            $query->where('created_at', '>=', $since);
        }

        match ($status) {
            'success' => $query->where('payment_status', 'COMPLETED'),
            'pending' => $query->where('payment_status', 'PENDING'),
            default => null,
        };

        $counts = $query
            ->select('payment_method', DB::raw('COUNT(*) as count'))
            ->groupBy('payment_method')
            ->pluck('count', 'payment_method');

        $methods = [];
        foreach ($counts as $method => $count) {
            $methods[$method ?: 'cash'] = (int) $count;
        }

        return $this->success([
            'period' => $period,
            'status' => $status,
            'payment_methods' => $methods,
        ], 'Payment breakdown retrieved successfully.');
    }

    /**
     * Operational totals across the fleet - not period-filtered, these are
     * lifetime/current-state counts, optionally scoped to one vehicle type.
     */
    public function vehicleSummary(Request $request)
    {
        $validated = $request->validate([
            'vehicle_type' => 'sometimes|integer|exists:vehicle_types,id',
        ]);

        $vehicleTypeId = $validated['vehicle_type'] ?? null;
        $pendingPayouts = LedgerAccount::where('code', 'PAYOUT_PAYABLE')->value('balance') ?? 0;

        $ridesQuery = Ride::query();
        $vehiclesQuery = Vehicle::query();
        $driversQuery = Driver::query()->where('availability', 1);

        if ($vehicleTypeId) {
            $ridesQuery->whereHas('vehicle', fn ($q) => $q->where('vehicle_type_id', $vehicleTypeId));
            $vehiclesQuery->where('vehicle_type_id', $vehicleTypeId);
            $driversQuery->whereHas('vehicles', fn ($q) => $q->where('vehicle_type_id', $vehicleTypeId));
        }

        $totalCustomers = $vehicleTypeId
            ? (clone $ridesQuery)->distinct('passenger_id')->count('passenger_id')
            : Passenger::count();

        return $this->success([
            'vehicle_type' => $vehicleTypeId,
            'total_rides' => (clone $ridesQuery)->count(),
            'total_customers' => $totalCustomers,
            'active_drivers' => $driversQuery->count(),
            'total_vehicles' => $vehiclesQuery->count(),
            // Payouts are a company-wide ledger balance - not meaningfully
            // splittable by vehicle type, so this figure doesn't change with the
            // filter above.
            'pending_payouts' => Money::of($pendingPayouts),
            // No loyalty-points feature exists anywhere in the codebase (no
            // table, no field) - N/A rather than a fabricated number.
            'loyalty_points_issued' => 'N/A',
        ], 'Vehicle performance summary retrieved successfully.');
    }

    private function sincePeriod(string $period): ?\Illuminate\Support\Carbon
    {
        return match ($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };
    }

    /** Revenue for each of the last 7 days, oldest first. */
    private function trend(): array
    {
        $days = collect(range(6, 0))->map(fn ($i) => now()->subDays($i)->startOfDay());

        return $days->map(function ($day) {
            $revenue = Ride::query()
                ->where('status', 'COMPLETED')
                ->whereBetween('completed_at', [$day, $day->copy()->endOfDay()])
                ->get(['final_fare', 'estimated_fare'])
                ->reduce(function ($carry, $ride) {
                    $rideGross = Money::isZero(Money::of($ride->final_fare))
                        ? Money::of($ride->estimated_fare)
                        : Money::of($ride->final_fare);

                    return Money::add($carry, $rideGross);
                }, '0.00');

            return [
                'date' => $day->toDateString(),
                'revenue' => $revenue,
            ];
        })->all();
    }

    /** Top 10 drivers by earnings within the selected period. */
    private function topDrivers(?\Illuminate\Support\Carbon $since): array
    {
        $query = Ride::query()
            ->join('drivers', 'drivers.id', '=', 'rides.driver_id')
            ->join('users', 'users.id', '=', 'drivers.user_id')
            ->where('rides.status', 'COMPLETED')
            ->select([
                'drivers.id as driver_id',
                'users.first_name',
                'users.last_name',
                'drivers.rating',
                DB::raw('COUNT(rides.id) as ride_count'),
                DB::raw('SUM(COALESCE(rides.driver_earning, rides.final_fare, rides.estimated_fare, 0)) as total_earnings'),
                DB::raw('SUM(COALESCE(rides.commission_amount, 0)) as total_commission'),
            ])
            ->groupBy('drivers.id', 'users.first_name', 'users.last_name', 'drivers.rating')
            ->orderByDesc('total_earnings')
            ->limit(10);

        if ($since) {
            $query->where('rides.completed_at', '>=', $since);
        }

        return $query->get()->map(fn ($row) => [
            'driver_id' => $row->driver_id,
            'name' => trim($row->first_name.' '.$row->last_name),
            'rides' => (int) $row->ride_count,
            'earnings' => Money::of($row->total_earnings),
            'commission' => Money::of($row->total_commission),
            'rating' => $row->rating,
        ])->all();
    }

    /** Latest 10 posted ledger entries, for the dashboard's activity table. */
    private function recentTransactions(): array
    {
        return JournalEntry::query()
            ->with('lines')
            ->orderByDesc('posted_at')
            ->limit(10)
            ->get(['id', 'type', 'description', 'gateway', 'posted_at'])
            ->map(fn (JournalEntry $entry) => [
                'id' => $entry->id,
                'type' => $entry->type,
                'description' => $entry->description,
                'gateway' => $entry->gateway,
                'amount' => $entry->lines->reduce(
                    fn ($carry, $line) => Money::add($carry, Money::sub((string) $line->credit, (string) $line->debit)),
                    '0.00'
                ),
                'posted_at' => $entry->posted_at?->toDateTimeString(),
            ])->all();
    }
}
