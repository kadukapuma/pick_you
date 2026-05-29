<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\FareConfig;
use App\Events\RideRequested;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RideController extends Controller
{
    use ApiResponse;

    /**
     * Display a single ride.
     */
    public function show($id)
    {
        $ride = Ride::with(['statuses', 'driver', 'vehicle', 'fareConfig'])->find($id);

        if (!$ride) {
            return $this->error('Ride not found', 404);
        }

        return $this->success($ride, 'Ride retrieved successfully');
    }

    /**
     * Return open ride requests that match the authenticated driver's active vehicle type.
     */
    public function driverRideRequests(Request $request)
    {
        $user = $request->user();

        if (!$user || !$user->driver) {
            return $this->error('Driver not found', 404);
        }

        $driver = $user->driver;

        if ((int) $driver->availability !== 1) {
            return $this->success([], 'Driver is offline');
        }

        $activeVehicle = $driver->vehicles()
            ->where('is_active', true)
            ->with('vehicleType')
            ->first();

        $vehicleTypeName = $activeVehicle?->vehicleType?->name ?? $driver->vehicle_type;

        if (!$vehicleTypeName) {
            return $this->success([], 'No active vehicle type found');
        }

        $rides = Ride::with(['passenger.user', 'fareConfig'])
            ->where('status', 'REQUESTED')
            ->whereHas('fareConfig', function ($query) use ($vehicleTypeName) {
                $query->where('vehicle_type', $vehicleTypeName);
            })
            ->orderByDesc('requested_at')
            ->get()
            ->map(function ($ride) {
                $passengerUser = $ride->passenger?->user;

                return [
                    'id' => $ride->id,
                    'ride_code' => $ride->ride_code,
                    'status' => $ride->status,
                    'vehicle_type' => $ride->fareConfig?->vehicle_type,
                    'passenger_name' => trim(($passengerUser?->first_name ?? 'Passenger') . ' ' . ($passengerUser?->last_name ?? '')),
                    'pickup_address' => $ride->pickup_address,
                    'drop_address' => $ride->drop_address,
                    'distance_km' => (float) $ride->distance_km,
                    'estimated_fare' => (float) $ride->estimated_fare,
                    'requested_at' => optional($ride->requested_at)?->toDateTimeString(),
                ];
            });

        return $this->success($rides, 'Driver ride requests retrieved successfully');
    }

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

        event(new RideRequested($ride->load('fareConfig')));

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
