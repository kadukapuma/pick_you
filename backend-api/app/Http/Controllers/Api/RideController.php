<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\FareConfig;
use App\Services\RideMatching\RideMatchingRedis;
use App\Services\RideMatching\RideMatchingService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class RideController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly RideMatchingService $rideMatching,
        private readonly RideMatchingRedis $rideMatchingRedis,
    ) {}

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

        $vehicleTypeName = $activeVehicle?->vehicleType?->name ?? $activeVehicle?->vehicle_type ?? $driver->vehicle_type;

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
            ->filter(function ($ride) use ($driver) {
                $targetedDriverId = $this->rideMatchingRedis->getCurrentDriver($ride->id);

                return $targetedDriverId !== null && $targetedDriverId === (int) $driver->id;
            })
            ->values()
            ->map(function ($ride) {
                $passengerUser = $ride->passenger?->user;

                return [
                    'id' => $ride->id,
                    'ride_code' => $ride->ride_code,
                    'status' => $ride->status,
                    'vehicle_type' => $ride->fareConfig?->vehicle_type,
                    'passenger_name' => trim(($passengerUser?->first_name ?? 'Passenger') . ' ' . ($passengerUser?->last_name ?? '')),
                    'pickup_address' => $ride->pickup_address,
                    'pickup_lat' => $ride->pickup_latitude,
                    'pickup_lng' => $ride->pickup_longitude,
                    'drop_address' => $ride->drop_address,
                    'drop_lat' => $ride->drop_latitude,
                    'drop_lng' => $ride->drop_longitude,
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

        $fareConfig = FareConfig::where('vehicle_type', $request->vehicle_type)->where('is_active', true)->first();
        if (!$fareConfig) {
            return $this->error('Selected vehicle type is currently unavailable', 400);
        }

        $estimatedFare = $fareConfig->base_fare + ($request->distance_km * $fareConfig->per_km_rate);

        $pickupLng = (float) $request->pickup_lng;
        $pickupLat = (float) $request->pickup_lat;
        $dropLng = (float) $request->drop_lng;
        $dropLat = (float) $request->drop_lat;

        $ride = Ride::create([
            'ride_code' => strtoupper(Str::random(8)),
            'passenger_id' => $passenger->id,
            'fare_id' => $fareConfig->id,
            'pickup_address' => $request->pickup_address,
            'pickup_point' => DB::raw("point($pickupLng, $pickupLat)"),
            'pickup_geog' => DB::raw("ST_SetSRID(ST_MakePoint($pickupLng, $pickupLat), 4326)::geography"),
            'drop_address' => $request->drop_address,
            'drop_point' => DB::raw("point($dropLng, $dropLat)"),
            'drop_geog' => DB::raw("ST_SetSRID(ST_MakePoint($dropLng, $dropLat), 4326)::geography"),
            'distance_km' => $request->distance_km,
            'estimated_fare' => $estimatedFare,
            'status' => 'REQUESTED',
            'requested_at' => now(),
        ]);

        $ride->refresh();

        $ride->statuses()->create([
            'status' => 'REQUESTED',
            'notes' => 'Passenger requested a ride.'
        ]);

        $matched = $this->rideMatching->startMatching(
            $ride,
            $pickupLat,
            $pickupLng,
            (string) $request->vehicle_type,
        );

        if (! $matched) {
            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);
            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'No online drivers available near passenger location.',
            ]);

            return $this->error('No online drivers available for vehicle type ' . $request->vehicle_type . '.', 404);
        }

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

        $targetedDriverId = $this->rideMatchingRedis->getCurrentDriver($ride->id);
        if ($targetedDriverId === null || $targetedDriverId !== (int) $driver->id) {
            return $this->error('You are not authorized to accept this ride request.', 403);
        }

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

        $this->rideMatching->cleanup($ride->id);

        return $this->success($ride, 'Ride accepted successfully');
    }

    /**
     * Driver starts the ride
     */
    public function startRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (!$ride || $ride->status !== 'ACCEPTED') {
            return $this->error('Ride cannot be started', 400);
        }

        $driver = $request->user()->driver;

        if (!$driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to start this ride', 403);
        }

        $ride->update([
            'status' => 'STARTED',
            'started_at' => now()
        ]);

        $ride->statuses()->create([
            'status' => 'STARTED',
            'notes' => 'Driver started the ride.'
        ]);

        return $this->success($ride, 'Ride started successfully');
    }

    /**
     * Driver rejects the ride
     */
    public function rejectRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (!$ride || $ride->status !== 'REQUESTED') {
            return $this->success([], 'Ride request is no longer available to reject.');
        }

        $driver = $request->user()->driver;

        $this->rideMatching->handleDriverRejection($ride->id, (int) $driver->id);

        return $this->success([], 'Ride request rejected successfully');
    }

    /**
     * Driver completes the ride
     */
    public function completeRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (!$ride || $ride->status !== 'STARTED') {
            return $this->error('Ride cannot be completed', 400);
        }

        $driver = $request->user()->driver;

        if (!$driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to complete this ride', 403);
        }

        $ride->update([
            'status' => 'COMPLETED',
            'completed_at' => now()
        ]);

        $ride->statuses()->create([
            'status' => 'COMPLETED',
            'notes' => 'Driver completed the ride.'
        ]);

        return $this->success($ride, 'Ride completed successfully');
    }

    /**
     * Cancel/Destroy the ride.
     */
    public function destroy($id)
    {
        $ride = Ride::find($id);

        if (!$ride || in_array($ride->status, ['COMPLETED', 'CANCELLED'])) {
            return $this->error('Ride cannot be cancelled', 400);
        }

        $ride->update([
            'status' => 'CANCELLED',
            'cancelled_at' => now()
        ]);

        $ride->statuses()->create([
            'status' => 'CANCELLED',
            'notes' => 'Ride was cancelled.'
        ]);

        $this->rideMatching->cleanup($ride->id);

        return $this->success($ride, 'Ride cancelled successfully');
    }
}
