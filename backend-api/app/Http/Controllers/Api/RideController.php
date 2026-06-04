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
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Log;
use App\Events\RideRequestedTargeted;
use App\Jobs\ProcessRideTimeout;

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

        $vehicleTypeName = $activeVehicle?->vehicleType?->name ?? $activeVehicle?->vehicle_type ?? $driver->vehicle_type;

        if (!$vehicleTypeName) {
            return $this->success([], 'No active vehicle type found');
        }

        // Query targeted driver from Redis for requested rides to ensure strict filtering and database query scaling
        $rides = Ride::with(['passenger.user', 'fareConfig'])
            ->where('status', 'REQUESTED')
            ->whereHas('fareConfig', function ($query) use ($vehicleTypeName) {
                $query->where('vehicle_type', $vehicleTypeName);
            })
            ->orderByDesc('requested_at')
            ->get()
            ->filter(function ($ride) use ($driver) {
                $targetedDriverId = Redis::get("ride:current_driver:{$ride->id}");
                return $targetedDriverId !== null && (int) $targetedDriverId === (int) $driver->id;
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

        // Query nearby online/approved drivers with matching active vehicle types
        $pickupLng = (float) $request->pickup_lng;
        $pickupLat = (float) $request->pickup_lat;
        $vehicleType = (string) $request->vehicle_type;

        $drivers = DB::table('driver_locations as dl')
            ->join('drivers as d', 'dl.driver_id', '=', 'd.id')
            ->where('d.availability', 1)
            ->where('d.status', 'approved')
            ->whereExists(function ($query) use ($vehicleType) {
                $query->select(DB::raw(1))
                    ->from('vehicles as v')
                    ->join('vehicle_types as vt', 'v.vehicle_type_id', '=', 'vt.id')
                    ->whereColumn('v.driver_id', 'd.id')
                    ->where('v.is_active', true)
                    ->where('vt.name', $vehicleType);
            })
            // PostgreSQL spatial point distance operator <->
            ->select('d.id as driver_id', DB::raw("dl.location <-> point($pickupLng, $pickupLat) AS distance"))
            ->orderBy('distance', 'asc')
            ->get();

        if ($drivers->isEmpty()) {
            Log::info("Ride store: No matching drivers found for Ride {$ride->id}");
            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now()
            ]);
            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'No online drivers available near passenger location.'
            ]);
            return $this->error('No online drivers available for vehicle type ' . $vehicleType . '.', 404);
        }

        // Push matching driver IDs into Redis matching list
        $driverIds = $drivers->pluck('driver_id')->toArray();
        Redis::rpush("ride:matching_drivers:{$ride->id}", ...$driverIds);

        Log::info("Ride store: Queued " . count($driverIds) . " drivers for Ride {$ride->id}. Candidates: " . implode(',', $driverIds));

        // Dispatches targeted event to the first driver
        $this->targetNextDriver($ride->id);

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

        // Verify if this driver is indeed the targeted driver for this ride
        $targetedDriverId = Redis::get("ride:current_driver:{$ride->id}");
        if ($targetedDriverId === null || (int) $targetedDriverId !== (int) $driver->id) {
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

        // Clean up Redis matching keys
        $this->cleanupRedisMatching($ride->id);

        return $this->success($ride, 'Ride accepted successfully');
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

        // Verify if this driver is indeed the currently targeted driver for this ride
        $targetedDriverId = Redis::get("ride:current_driver:{$ride->id}");
        if ($targetedDriverId !== null && (int) $targetedDriverId === (int) $driver->id) {
            Log::info("rejectRide: Driver {$driver->id} rejected Ride {$ride->id}. Transitioning immediately.");
            $this->targetNextDriver($ride->id);
        }

        return $this->success([], 'Ride request rejected successfully');
    }

    /**
     * Target the next nearest driver in the Redis matching queue for the ride.
     */
    public function targetNextDriver(int $rideId): void
    {
        $ride = Ride::find($rideId);
        if (!$ride || $ride->status !== 'REQUESTED') {
            Log::info("targetNextDriver: Ride {$rideId} is no longer requested or not found. Cleaning up Redis.");
            $this->cleanupRedisMatching($rideId);
            return;
        }

        // Pop the next driver ID from Redis queue
        $driverId = Redis::lpop("ride:matching_drivers:{$rideId}");

        if (!$driverId) {
            Log::info("targetNextDriver: No candidate drivers left for Ride {$rideId}. Cancelling ride.");
            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);

            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'No drivers available near passenger location.'
            ]);

            $this->cleanupRedisMatching($rideId);
            return;
        }

        $driverId = (int) $driverId;

        // Set the currently targeted driver in Redis
        Redis::set("ride:current_driver:{$rideId}", $driverId);

        Log::info("targetNextDriver: Targeting Driver {$driverId} for Ride {$rideId}");

        $ride->refresh();

        // Broadcast targeted WebSocket event
        event(new RideRequestedTargeted($ride->load(['passenger.user', 'fareConfig']), $driverId));

        $offerSeconds = max(8, (int) config('ride.driver_offer_seconds', 12));

        ProcessRideTimeout::dispatch($rideId, $driverId)
            ->delay(now()->addSeconds($offerSeconds));
    }

    /**
     * Clean up Redis matching keys for a ride.
     */
    public function cleanupRedisMatching(int $rideId): void
    {
        Redis::del("ride:matching_drivers:{$rideId}");
        Redis::del("ride:current_driver:{$rideId}");
        Log::info("cleanupRedisMatching: Cleaned up Redis keys for Ride {$rideId}");
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

        // Clean up Redis matching keys
        $this->cleanupRedisMatching($ride->id);

        return $this->success($ride, 'Ride cancelled successfully');
    }
}
