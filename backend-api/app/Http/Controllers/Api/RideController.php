<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\FareConfig;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RideController extends Controller
{
    use ApiResponse;

    /**
     * Passenger requests a new ride
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_type' => 'required|string',
            'pickup_address' => 'required|string',
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'drop_address' => 'required|string',
            'drop_lat' => 'required|numeric',
            'drop_lng' => 'required|numeric',
            'distance_km' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $passenger = $request->user()->passenger;

        // Calculate Estimated Fare based on vehicle type
        $fareConfig = FareConfig::where('vehicle_type', $request->vehicle_type)->where('is_active', true)->first();
        if (!$fareConfig) {
            return $this->error('Selected vehicle type is currently unavailable', 400);
        }

        $estimatedFare = $fareConfig->base_fare + ($request->distance_km * $fareConfig->per_km_rate);

        // Create the Ride record
        $ride = Ride::create([
            'ride_code' => strtoupper(Str::random(8)),
            'passenger_id' => $passenger->id,
            'fare_id' => $fareConfig->id,
            'pickup_address' => $request->pickup_address,
            'pickup_point' => DB::raw("point($request->pickup_lng, $request->pickup_lat)"),
            'drop_address' => $request->drop_address,
            'drop_point' => DB::raw("point($request->drop_lng, $request->drop_lat)"),
            'distance_km' => $request->distance_km,
            'estimated_fare' => $estimatedFare,
            'status' => 'REQUESTED',
            'requested_at' => now(),
        ]);

        $ride->refresh();

        // Log the status
        $ride->statuses()->create([
            'status' => 'REQUESTED',
            'notes' => 'Passenger requested a ride.'
        ]);

        // TODO: Trigger Event/WebSocket to broadcast to nearby drivers

        return $this->success($ride, 'Ride requested successfully', 201);
    }

    /**
     * Driver accepts the ride
     */
    public function acceptRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (!$ride || $ride->status !== 'REQUESTED') {
            return $this->error('Ride is no longer available', 400);
        }

        $driver = $request->user()->driver;
        $vehicle = $driver->vehicles()->where('is_active', true)->first();

        if (!$vehicle) {
            return $this->error('No active vehicle found for driver', 400);
        }

        $ride->update([
            'driver_id' => $driver->id,
            'vehicle_id' => $vehicle->id,
            'status' => 'ACCEPTED',
            'accepted_at' => now()
        ]);

        $ride->statuses()->create([
            'status' => 'ACCEPTED',
            'notes' => 'Driver accepted the ride.'
        ]);

        return $this->success($ride, 'Ride accepted successfully');
    }
}