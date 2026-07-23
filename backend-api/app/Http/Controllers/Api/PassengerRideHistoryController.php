<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Services\Rides\RideStateMachine;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PassengerRideHistoryController extends Controller
{
    use ApiResponse;

    /** Return the authenticated passenger's completed or cancelled rides. */
    public function index(Request $request)
    {
        $data = $request->validate([
            'status' => ['nullable', 'in:COMPLETED,CANCELLED'],
        ]);

        $rides = Ride::with(['driver.user', 'vehicle.vehicleType', 'payment'])
            ->where('passenger_id', $request->user()->passenger->id)
            ->when($data['status'] ?? null, fn ($query, $status) => $query->where('status', $status))
            ->whereIn('status', [RideStateMachine::COMPLETED, RideStateMachine::CANCELLED])
            ->latest('updated_at')
            ->paginate(30);

        return $this->success($rides, 'Ride history retrieved successfully');
    }
}
