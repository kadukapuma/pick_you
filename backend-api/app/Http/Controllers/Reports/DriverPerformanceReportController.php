<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Services\Ledger\Money;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DriverPerformanceReportController extends Controller
{
    use ApiResponse;

    /** Per-driver ride volume + rating, for the Driver Performance report. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
            'search' => 'sometimes|string|max:100',
            'start' => 'sometimes|date',
            'end' => 'sometimes|date',
        ]);

        $rows = $this->driverAggregates(
            $validated['period'] ?? 'month',
            $validated['search'] ?? null,
            $validated['start'] ?? null,
            $validated['end'] ?? null,
        )->paginate(50);

        $rows->getCollection()->transform(fn ($row) => [
            'driver_id' => $row->driver_id,
            'name' => trim($row->first_name.' '.$row->last_name),
            'phone' => $row->phone,
            'rides' => (int) $row->ride_count,
            'completed_rides' => (int) $row->completed_count,
            'cancelled_rides' => (int) $row->cancelled_count,
            'rating' => $row->rating,
        ]);

        return $this->success($rows, 'Driver performance report retrieved successfully.');
    }

    /** Per-driver earnings + commission, for the Driver Earnings report. */
    public function earnings(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
            'search' => 'sometimes|string|max:100',
            'start' => 'sometimes|date',
            'end' => 'sometimes|date',
        ]);

        $rows = $this->driverAggregates(
            $validated['period'] ?? 'month',
            $validated['search'] ?? null,
            $validated['start'] ?? null,
            $validated['end'] ?? null,
        )
            ->orderByDesc('total_earnings')
            ->paginate(50);

        $rows->getCollection()->transform(fn ($row) => [
            'driver_id' => $row->driver_id,
            'name' => trim($row->first_name.' '.$row->last_name),
            'phone' => $row->phone,
            'rides' => (int) $row->completed_count,
            'gross_fares' => Money::of($row->gross_fares),
            'commission' => Money::of($row->total_commission),
            'earnings' => Money::of($row->total_earnings),
        ]);

        return $this->success($rows, 'Driver earnings report retrieved successfully.');
    }

    private function driverAggregates(string $period, ?string $search, ?string $start = null, ?string $end = null)
    {
        // An explicit date range (calendar picker) takes priority over the
        // fixed day/week/month/all buttons - both filter the same
        // requested_at column below, they're just two ways to set it.
        $since = $start ? now()->parse($start)->startOfDay() : match ($period) {
            'day' => now()->startOfDay(),
            'week' => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };
        $until = $end ? now()->parse($end)->endOfDay() : null;

        $query = Ride::query()
            ->join('drivers', 'drivers.id', '=', 'rides.driver_id')
            ->join('users', 'users.id', '=', 'drivers.user_id')
            ->select([
                'drivers.id as driver_id',
                'users.first_name',
                'users.last_name',
                'users.phone',
                'drivers.rating',
                DB::raw('COUNT(rides.id) as ride_count'),
                DB::raw("COUNT(rides.id) FILTER (WHERE rides.status = 'COMPLETED') as completed_count"),
                DB::raw("COUNT(rides.id) FILTER (WHERE rides.status = 'CANCELLED') as cancelled_count"),
                DB::raw("SUM(CASE WHEN rides.status = 'COMPLETED' THEN COALESCE(NULLIF(rides.final_fare, 0), rides.estimated_fare, 0) ELSE 0 END) as gross_fares"),
                DB::raw("SUM(CASE WHEN rides.status = 'COMPLETED' THEN COALESCE(rides.commission_amount, 0) ELSE 0 END) as total_commission"),
                DB::raw("SUM(CASE WHEN rides.status = 'COMPLETED' THEN COALESCE(rides.driver_earning, NULLIF(rides.final_fare, 0), rides.estimated_fare, 0) ELSE 0 END) as total_earnings"),
            ])
            ->groupBy('drivers.id', 'users.first_name', 'users.last_name', 'users.phone', 'drivers.rating');

        if ($since) {
            $query->where('rides.requested_at', '>=', $since);
        }

        if ($until) {
            $query->where('rides.requested_at', '<=', $until);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('users.first_name', 'like', "%{$search}%")
                    ->orWhere('users.last_name', 'like', "%{$search}%")
                    ->orWhere('users.phone', 'like', "%{$search}%");
            });
        }

        return $query;
    }
}
