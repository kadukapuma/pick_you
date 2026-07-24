<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Services\Rides\RideStateMachine;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DriverRideHistoryController extends Controller
{
    use ApiResponse;

    /** Return the authenticated driver's ongoing and past rides. */
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'string', 'in:ongoing,completed,cancelled'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $driver = $request->user()->driver;
        if (! $driver) {
            return $this->error('Driver profile not found', 404);
        }

        $statusGroups = [
            'ongoing' => [
                RideStateMachine::ACCEPTED,
                RideStateMachine::ARRIVED,
                RideStateMachine::STARTED,
            ],
            'completed' => [RideStateMachine::COMPLETED],
            'cancelled' => [RideStateMachine::CANCELLED],
        ];
        $statuses = $statusGroups[$data['status'] ?? ''] ?? [
            RideStateMachine::ACCEPTED,
            RideStateMachine::ARRIVED,
            RideStateMachine::STARTED,
            RideStateMachine::COMPLETED,
            RideStateMachine::CANCELLED,
        ];
        $perPage = (int) ($data['per_page'] ?? 15);

        $rides = Ride::with(['passenger.user', 'vehicle.vehicleType', 'fareConfig', 'payment'])
            ->where('driver_id', $driver->id)
            ->whereIn('status', $statuses)
            ->latest('updated_at')
            ->paginate($perPage);

        return $this->success($rides, 'Driver ride history retrieved successfully');
    }
}
