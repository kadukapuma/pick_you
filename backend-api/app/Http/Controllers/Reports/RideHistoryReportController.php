<?php

namespace App\Http\Controllers\Reports;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class RideHistoryReportController extends Controller
{
    use ApiResponse;

    /** Full ride-by-ride ledger for the admin "Ride History" report. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'period' => 'sometimes|in:day,week,month,all',
            'start' => 'sometimes|date',
            'end' => 'sometimes|date',
            'status' => 'sometimes|in:REQUESTED,ACCEPTED,ARRIVED,STARTED,ONGOING,COMPLETED,CANCELLED',
            'search' => 'sometimes|string|max:100',
        ]);

        $since = $validated['start'] ?? null
            ? now()->parse($validated['start'])->startOfDay()
            : match ($validated['period'] ?? null) {
                'day' => now()->startOfDay(),
                'week' => now()->startOfWeek(),
                'month' => now()->startOfMonth(),
                default => null,
            };
        $until = ! empty($validated['end']) ? now()->parse($validated['end'])->endOfDay() : null;

        $query = Ride::query()
            ->leftJoin('drivers', 'drivers.id', '=', 'rides.driver_id')
            ->leftJoin('users as driver_users', 'driver_users.id', '=', 'drivers.user_id')
            ->leftJoin('passengers', 'passengers.id', '=', 'rides.passenger_id')
            ->leftJoin('users as passenger_users', 'passenger_users.id', '=', 'passengers.user_id')
            ->select([
                'rides.id',
                'rides.ride_code',
                'rides.status',
                'rides.pickup_address',
                'rides.drop_address',
                'rides.commission_amount',
                'rides.estimated_fare',
                'rides.final_fare',
                'rides.fare_breakdown',
                'rides.requested_at',
                'rides.completed_at',
                'driver_users.first_name as driver_first_name',
                'driver_users.last_name as driver_last_name',
                'passenger_users.first_name as passenger_first_name',
                'passenger_users.last_name as passenger_last_name',
            ])
            ->orderByDesc('rides.requested_at');

        if (! empty($validated['status'])) {
            // "Ongoing" isn't a real ride status - it's a UI-friendly stand-in for
            // the three in-flight states, since admins don't need to distinguish
            // accepted/arrived/started when filtering the ledger.
            if ($validated['status'] === 'ONGOING') {
                $query->whereIn('rides.status', ['ACCEPTED', 'ARRIVED', 'STARTED']);
            } else {
                $query->where('rides.status', $validated['status']);
            }
        }

        if ($since) {
            $query->where('rides.requested_at', '>=', $since);
        }

        if ($until) {
            $query->where('rides.requested_at', '<=', $until);
        }

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('rides.ride_code', 'like', "%{$search}%")
                    ->orWhere('rides.pickup_address', 'like', "%{$search}%")
                    ->orWhere('rides.drop_address', 'like', "%{$search}%")
                    ->orWhere('driver_users.first_name', 'like', "%{$search}%")
                    ->orWhere('driver_users.last_name', 'like', "%{$search}%")
                    ->orWhere('passenger_users.first_name', 'like', "%{$search}%")
                    ->orWhere('passenger_users.last_name', 'like', "%{$search}%");
            });
        }

        $rides = $query->paginate(50);

        $rides->getCollection()->transform(fn ($row) => [
            'id' => $row->id,
            'ride_code' => $row->ride_code,
            'status' => $row->status,
            'driver' => trim(($row->driver_first_name ?? '').' '.($row->driver_last_name ?? '')) ?: 'Unassigned',
            'customer' => trim(($row->passenger_first_name ?? '').' '.($row->passenger_last_name ?? '')) ?: '—',
            'pickup' => $row->pickup_address,
            'drop' => $row->drop_address,
            'commission' => $row->commission_amount,
            'estimated_fare' => $row->estimated_fare,
            'final_fare' => $row->final_fare,
            'fare_breakdown' => $row->fare_breakdown,
            'requested_at' => $row->requested_at,
            'completed_at' => $row->completed_at,
        ]);

        return $this->success($rides, 'Ride history retrieved successfully.');
    }
}
