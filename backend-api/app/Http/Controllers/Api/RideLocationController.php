<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Services\Locations\DriverLocationService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class RideLocationController extends Controller
{
    use ApiResponse;

    public function show(Request $request, int $id, DriverLocationService $locations)
    {
        $ride = Ride::query()->find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        if ($request->user()->cannot('view', $ride)) {
            return $this->error('You are not authorized to view this ride location', 403);
        }

        $location = $locations->latestForRide($ride);

        if (! $location) {
            return $this->error('Driver location is not available', 404);
        }

        return $this->success($location, 'Driver location retrieved successfully');
    }
}
