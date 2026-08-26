<?php

namespace App\Http\Controllers\Api;

use App\Events\RideStatusUpdated;
use App\Exceptions\GoogleMapsException;
use App\Http\Controllers\Controller;
use App\Models\DriverAccount;
use App\Models\FareConfig;
use App\Models\Ride;
use App\Models\User;
use App\Services\Fares\FareCalculationService;
use App\Services\Ledger\CommissionService;
use App\Services\Maps\GoogleMapsService;
use App\Services\RideMatching\RideMatchingRedis;
use App\Services\RideMatching\RideMatchingService;
use App\Services\Notifications\NotificationService;
use App\Services\Rides\RideStateMachine;
use App\Services\Rides\RideTransitionService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class RideController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly RideMatchingService $rideMatching,
        private readonly RideMatchingRedis $rideMatchingRedis,
        private readonly RideTransitionService $rideTransition,
        private readonly FareCalculationService $fares,
        private readonly CommissionService $commission,
        private readonly GoogleMapsService $maps,
        private readonly NotificationService $notifications,
    ) {}

    /**
     * Display a single ride.
     */
    public function show(Request $request, $id)
    {
        $ride = Ride::with([
            'statuses',
            'passenger.user',
            'driver.user',
            'vehicle',
            'fareConfig',
            'payment.allocations',
            'payment.refunds',
        ])->find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        if ($request->user()->cannot('view', $ride)) {
            return $this->error('You are not authorized to view this ride', 403);
        }

        return $this->success($ride, 'Ride retrieved successfully');
    }

    /**
     * Return open ride requests that match the authenticated driver's active vehicle type.
     */
    public function driverRideRequests(Request $request)
    {
        $user = $request->user();

        if (! $user || ! $user->driver) {
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

        if (! $vehicleTypeName) {
            return $this->success([], 'No active vehicle type found');
        }

        try {
            $targetedRideIds = $this->rideMatchingRedis->currentRideIdsForDriver((int) $driver->id);
        } catch (Throwable $exception) {
            Log::warning('Could not read targeted rides from Redis.', [
                'driver_id' => $driver->id,
                'error' => $exception->getMessage(),
            ]);

            return $this->error('Ride request service is temporarily unavailable.', 503);
        }

        if ($targetedRideIds === []) {
            return $this->success([], 'Driver ride requests retrieved successfully');
        }

        $rides = Ride::with(['passenger.user', 'fareConfig'])
            ->where('status', 'REQUESTED')
            ->whereIn('id', $targetedRideIds)
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
                    'use_wallet_credit' => (bool) $ride->use_wallet_credit,
                    'use_loyalty_points' => (bool) $ride->use_loyalty_points,
                    'passenger_name' => trim(($passengerUser?->first_name ?? 'Passenger').' '.($passengerUser?->last_name ?? '')),
                    'passenger_profile_picture' => $passengerUser?->profile_picture,
                    'pickup_address' => $ride->pickup_address,
                    'pickup_lat' => $ride->pickup_latitude,
                    'pickup_lng' => $ride->pickup_longitude,
                    'drop_address' => $ride->drop_address,
                    'drop_lat' => $ride->drop_latitude,
                    'drop_lng' => $ride->drop_longitude,
                    // Round trip: the driver needs to see this — and the destination —
                    // before accepting, since they're committing to drive there and back.
                    'trip_type' => $ride->trip_type,
                    'destination_address' => $ride->destination_address,
                    'destination_lat' => $ride->destination_latitude,
                    'destination_lng' => $ride->destination_longitude,
                    'distance_km' => (float) $ride->distance_km,
                    'estimated_fare' => (float) $ride->estimated_fare,
                    // The driver needs this before accepting: it decides whether
                    // they collect cash at the end or nothing at all.
                    'payment_method' => $ride->payment_method,
                    'use_wallet_credit' => (bool) $ride->use_wallet_credit,
                    'use_loyalty_points' => (bool) $ride->use_loyalty_points,
                    'requested_at' => optional($ride->requested_at)?->toDateTimeString(),
                    // This is the server deadline, not 20 seconds from when a
                    // delayed push notification is opened on the device.
                    'expires_at' => $this->rideMatchingRedis->getOfferExpiresAt($ride->id),
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
            'distance_km' => 'nullable|numeric',
            'estimated_duration_minutes' => 'nullable|numeric|min:0',
            // Older app builds omit this; default to cash so they keep working.
            'payment_method' => 'sometimes|in:cash,card',
            'use_wallet_credit' => 'sometimes|boolean',
            'use_loyalty_points' => 'sometimes|boolean',
            // Return trip: driver takes the passenger to a destination and back to
            // pickup. The drop is always the pickup point for a return trip — never
            // taken from the request — so only the destination needs validating here.
            'trip_type' => 'sometimes|in:oneway,return',
            'destination_address' => 'required_if:trip_type,return|string',
            'destination_lat' => 'required_if:trip_type,return|numeric',
            'destination_lng' => 'required_if:trip_type,return|numeric',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $passenger = $request->user()->passenger;

        $fareConfig = FareConfig::where('vehicle_type', $request->vehicle_type)->where('is_active', true)->first();
        if (! $fareConfig) {
            return $this->error('Selected vehicle type is currently unavailable', 400);
        }

        $pickupLng = (float) $request->pickup_lng;
        $pickupLat = (float) $request->pickup_lat;
        $tripType = $request->input('trip_type', 'oneway');
        $isReturn = $tripType === 'return';

        // A return trip always ends back at the pickup point — the drop is derived,
        // never taken from the request, so the passenger can't be dropped somewhere
        // other than where they started on a "return" booking.
        $dropLng = $isReturn ? $pickupLng : (float) $request->drop_lng;
        $dropLat = $isReturn ? $pickupLat : (float) $request->drop_lat;
        $dropAddress = $isReturn ? $request->pickup_address : $request->drop_address;

        $outboundEstimate = null;

        try {
            if ($isReturn) {
                $destinationLat = (float) $request->destination_lat;
                $destinationLng = (float) $request->destination_lng;

                // Outbound leg: pickup -> destination. Return leg: destination -> pickup.
                $route = $this->maps->route($pickupLat, $pickupLng, $destinationLat, $destinationLng);
                $returnRoute = $this->maps->route($destinationLat, $destinationLng, $pickupLat, $pickupLng);

                $totalDistanceMeters = (float) $route['distance'] + (float) $returnRoute['distance'];
                $totalDurationSeconds = (float) $route['duration'] + (float) $returnRoute['duration'];

                // One-way estimate, kept as the fare floor for a ride that ends at
                // the destination instead of completing the return leg - see
                // arriveDestination()/completeRide() and
                // FareCalculationService::completionBreakdown().
                $outboundEstimate = $this->fares->estimate(
                    $fareConfig,
                    ((float) $route['distance']) / 1000,
                    ((float) $route['duration']) / 60,
                    $pickupLat,
                    $pickupLng,
                    $destinationLat,
                    $destinationLng,
                );
            } else {
                $route = $this->maps->route($pickupLat, $pickupLng, $dropLat, $dropLng);

                $totalDistanceMeters = (float) $route['distance'];
                $totalDurationSeconds = (float) $route['duration'];
            }
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }

        $fareEstimate = $this->fares->estimate(
            $fareConfig,
            $totalDistanceMeters / 1000,
            $totalDurationSeconds / 60,
            $pickupLat,
            $pickupLng,
            $dropLat,
            $dropLng,
        );

        $estimatedFare = (string) $fareEstimate['estimated_fare'];
        $outboundFare = $outboundEstimate ? (string) $outboundEstimate['estimated_fare'] : null;
        if ($passenger->isVerifiedStudent()) {
            $estimatedFare = $this->commission->studentAdjustedFare($estimatedFare, $fareConfig);
            if ($outboundFare !== null) {
                $outboundFare = $this->commission->studentAdjustedFare($outboundFare, $fareConfig);
            }
        }

        $ride = Ride::create([
            'ride_code' => strtoupper(Str::random(8)),
            'passenger_id' => $passenger->id,
            'fare_id' => $fareConfig->id,
            'pickup_address' => $request->pickup_address,
            'pickup_point' => DB::raw("point($pickupLng, $pickupLat)"),
            'pickup_geog' => DB::raw("ST_SetSRID(ST_MakePoint($pickupLng, $pickupLat), 4326)::geography"),
            'drop_address' => $dropAddress,
            'drop_point' => DB::raw("point($dropLng, $dropLat)"),
            'drop_geog' => DB::raw("ST_SetSRID(ST_MakePoint($dropLng, $dropLat), 4326)::geography"),
            'trip_type' => $tripType,
            'destination_address' => $isReturn ? $request->destination_address : null,
            'destination_point' => $isReturn ? DB::raw("point($destinationLng, $destinationLat)") : null,
            'destination_geog' => $isReturn ? DB::raw("ST_SetSRID(ST_MakePoint($destinationLng, $destinationLat), 4326)::geography") : null,
            'outbound_distance_km' => $outboundEstimate['distance_km'] ?? null,
            'outbound_duration_minutes' => $outboundEstimate['duration_minutes'] ?? null,
            'outbound_fare' => $outboundFare,
            'distance_km' => $fareEstimate['distance_km'],
            'estimated_distance_km' => $fareEstimate['distance_km'],
            'estimated_duration_minutes' => $fareEstimate['duration_minutes'],
            'estimated_fare' => $estimatedFare,
            'payment_method' => $request->input('payment_method', 'cash'),
            'use_wallet_credit' => $request->boolean(
                'use_wallet_credit'
            ),
            'use_loyalty_points' => $request->boolean(
                'use_loyalty_points'
            ),
            'fare_breakdown' => [
                'policy' => 'estimate_plus_extras',
                'version' => 1,
                'estimate' => $fareEstimate['breakdown'],
            ],
            'status' => 'REQUESTED',
            'requested_at' => now(),
        ]);

        $ride->refresh();

        $ride->statuses()->create([
            'status' => 'REQUESTED',
            'notes' => 'Passenger requested a ride.',
        ]);

        try {
            $matched = $this->rideMatching->startMatching(
                $ride,
                $pickupLat,
                $pickupLng,
                (string) $request->vehicle_type,
            );
        } catch (Throwable $exception) {
            Log::error('Ride matching failed after ride creation.', [
                'ride_id' => $ride->id,
                'error' => $exception->getMessage(),
            ]);

            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);
            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'Ride matching service was unavailable.',
            ]);

            try {
                $this->rideMatching->cleanup($ride->id);
            } catch (Throwable) {
                //
            }

            return $this->error('Ride matching service is temporarily unavailable. Please try again.', 503);
        }

        if (! $matched) {
            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);
            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'No online drivers available near passenger location.',
            ]);

            return $this->error('No online drivers available for vehicle type '.$request->vehicle_type.'.', 404);
        }

        return $this->success($ride, 'Ride requested successfully', 201);
    }

    /**
     * Passenger requests an authoritative route and fare estimate before booking.
     */
    public function estimate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'vehicle_type' => 'required|string',
            'pickup_lat' => 'required|numeric',
            'pickup_lng' => 'required|numeric',
            'drop_lat' => 'required_unless:trip_type,return|numeric',
            'drop_lng' => 'required_unless:trip_type,return|numeric',
            'trip_type' => 'sometimes|in:oneway,return',
            'destination_lat' => 'required_if:trip_type,return|numeric',
            'destination_lng' => 'required_if:trip_type,return|numeric',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $fareConfig = FareConfig::where('vehicle_type', $request->vehicle_type)->where('is_active', true)->first();
        if (! $fareConfig) {
            return $this->error('Selected vehicle type is currently unavailable', 400);
        }

        $pickupLat = (float) $request->pickup_lat;
        $pickupLng = (float) $request->pickup_lng;
        $isReturn = $request->input('trip_type', 'oneway') === 'return';
        $dropLat = $isReturn ? $pickupLat : (float) $request->drop_lat;
        $dropLng = $isReturn ? $pickupLng : (float) $request->drop_lng;

        $outboundEstimate = null;

        try {
            if ($isReturn) {
                $destinationLat = (float) $request->destination_lat;
                $destinationLng = (float) $request->destination_lng;

                $route = $this->maps->route($pickupLat, $pickupLng, $destinationLat, $destinationLng);
                $returnRoute = $this->maps->route($destinationLat, $destinationLng, $pickupLat, $pickupLng);

                $totalDistanceMeters = (float) $route['distance'] + (float) $returnRoute['distance'];
                $totalDurationSeconds = (float) $route['duration'] + (float) $returnRoute['duration'];

                $outboundEstimate = $this->fares->estimate(
                    $fareConfig,
                    ((float) $route['distance']) / 1000,
                    ((float) $route['duration']) / 60,
                    $pickupLat,
                    $pickupLng,
                    $destinationLat,
                    $destinationLng,
                );
            } else {
                $route = $this->maps->route($pickupLat, $pickupLng, $dropLat, $dropLng);
                $returnRoute = null;

                $totalDistanceMeters = (float) $route['distance'];
                $totalDurationSeconds = (float) $route['duration'];
            }
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }

        $fareEstimate = $this->fares->estimate(
            $fareConfig,
            $totalDistanceMeters / 1000,
            $totalDurationSeconds / 60,
            $pickupLat,
            $pickupLng,
            $dropLat,
            $dropLng,
        );

        $estimatedFare = (string) $fareEstimate['estimated_fare'];
        $outboundFare = $outboundEstimate ? (string) $outboundEstimate['estimated_fare'] : null;
        if ($request->user()->passenger?->isVerifiedStudent()) {
            $estimatedFare = $this->commission->studentAdjustedFare($estimatedFare, $fareConfig);
            if ($outboundFare !== null) {
                $outboundFare = $this->commission->studentAdjustedFare($outboundFare, $fareConfig);
            }
        }

        return $this->success([
            'vehicle_type' => $fareConfig->vehicle_type,
            'route' => $route,
            // Present only for a return trip - the destination -> pickup leg, so the
            // app can draw the full out-and-back route on the map.
            'return_route' => $returnRoute,
            'distance_km' => $fareEstimate['distance_km'],
            'estimated_distance_km' => $fareEstimate['distance_km'],
            'estimated_duration_minutes' => $fareEstimate['duration_minutes'],
            'estimated_fare' => $estimatedFare,
            'fare_breakdown' => $fareEstimate['breakdown'],
            // What the fare would be if the ride ends at the destination
            // instead of completing the return leg (see completeRide()).
            'outbound_distance_km' => $outboundEstimate['distance_km'] ?? null,
            'outbound_duration_minutes' => $outboundEstimate['duration_minutes'] ?? null,
            'outbound_fare' => $outboundFare,
        ], 'Ride estimate calculated successfully');
    }

    /**
     * Driver accepts the ride
     */
    public function acceptRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride || $ride->status !== 'REQUESTED') {
            return $this->error('Ride is no longer available', 400);
        }

        $driver = $request->user()->driver;

        $targetedDriverId = $this->rideMatchingRedis->getCurrentDriver($ride->id);
        if ($targetedDriverId === null || $targetedDriverId !== (int) $driver->id) {
            return $this->error('You are not authorized to accept this ride request.', 403);
        }

        $vehicle = $driver->vehicles()->where('is_active', true)->first();

        if (! $vehicle) {
            return $this->error('No active vehicle found for driver', 400);
        }

        $account = DriverAccount::forDriver((int) $driver->id);

        if (! $account->canAcceptRides()) {
            return $this->error(
                $account->is_blocked
                    ? ($account->block_reason ?: 'Your account is blocked. Please contact support.')
                    : 'You owe PickU '.ltrim($account->balance(), '-').'. Please top up to continue accepting rides.',
                403,
            );
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::ACCEPTED,
                'Driver accepted the ride.',
                [
                    'driver_id' => $driver->id,
                    'vehicle_id' => $vehicle->id,
                ],
            );
        } catch (DomainException) {
            return $this->error('Ride is no longer available', 409);
        }

        $this->rideMatching->cleanup($ride->id);
        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $driverUser = $ride->driver?->user;
        $driverName = trim(($driverUser?->first_name ?? 'Your driver').' '.($driverUser?->last_name ?? ''));
        $this->notifications->notify(
            $ride->passenger->user,
            'Ride Booked',
            "Ride booked with {$driverName} in vehicle {$ride->vehicle->vehicle_number}.",
            ['ride_id' => $ride->id, 'status' => $ride->status],
        );

        return $this->success($ride, 'Ride accepted successfully');
    }

    /**
     * Driver starts the ride
     */
    public function startRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        $driver = $request->user()->driver;

        if (! $driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to start this ride', 403);
        }

        if ($ride->status === 'STARTED') {
            return $this->success($ride, 'Ride already started');
        }

        if ($ride->status !== 'ARRIVED') {
            return $this->error('Driver must mark arrived before starting the ride', 400);
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::STARTED,
                'Driver started the ride.',
            );
        } catch (DomainException) {
            return $this->error('Ride cannot be started', 409);
        }

        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $this->notifications->notify(
            $ride->passenger->user,
            'Trip Started',
            'Trip started. Enjoy your ride!',
            ['ride_id' => $ride->id, 'status' => $ride->status],
        );

        return $this->success($ride, 'Ride started successfully');
    }

    /**
     * Driver arrived at pickup.
     */
    public function arriveRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        $driver = $request->user()->driver;

        if (! $driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to update this ride', 403);
        }

        if ($ride->status === 'ARRIVED') {
            return $this->success($ride, 'Driver already arrived at pickup');
        }

        if ($ride->status === 'STARTED') {
            return $this->error('Ride already started', 400);
        }

        if ($ride->status !== 'ACCEPTED') {
            return $this->error('Ride cannot be marked as arrived', 400);
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::ARRIVED,
                'Driver arrived at pickup.',
            );
        } catch (DomainException) {
            return $this->error('Ride cannot be marked as arrived', 409);
        }

        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $this->notifications->notify(
            $ride->passenger->user,
            'Driver Arrived',
            'Your driver has arrived. Cancelling the ride now may cost a fee.',
            ['ride_id' => $ride->id, 'status' => $ride->status],
        );

        return $this->success($ride, 'Driver arrived at pickup');
    }

    /**
     * Return trip only: driver marks arrival at the destination, before
     * either starting the return leg or the ride being completed there.
     */
    public function arriveDestination(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        $driver = $request->user()->driver;

        if (! $driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to update this ride', 403);
        }

        if ($ride->trip_type !== 'return') {
            return $this->error('Only return trips have a destination arrival step', 400);
        }

        if ($ride->status === 'WAITING') {
            return $this->success($ride, 'Already marked arrived at the destination');
        }

        if ($ride->status !== 'STARTED') {
            return $this->error('Ride must be in progress to mark arrival at the destination', 400);
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::WAITING,
                'Driver arrived at the destination.',
            );
        } catch (DomainException) {
            return $this->error('Cannot mark arrival at the destination', 409);
        }

        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $this->notifications->notify(
            $ride->passenger->user,
            'Arrived at Destination',
            'Your driver has arrived at the destination.',
            ['ride_id' => $ride->id, 'status' => $ride->status],
        );

        return $this->success($ride, 'Marked arrived at the destination');
    }

    /**
     * Return trip only: driver starts the return leg back to the pickup point.
     */
    public function startReturn(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride) {
            return $this->error('Ride not found', 404);
        }

        $driver = $request->user()->driver;

        if (! $driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to update this ride', 403);
        }

        if ($ride->status === 'RETURNING') {
            return $this->success($ride, 'Return leg already started');
        }

        if ($ride->status !== 'WAITING') {
            return $this->error('Driver must mark arrival at the destination before starting the return leg', 400);
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::RETURNING,
                'Driver started the return leg.',
            );
        } catch (DomainException) {
            return $this->error('Cannot start the return leg', 409);
        }

        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $this->notifications->notify(
            $ride->passenger->user,
            'Return Trip Started',
            'Your driver is now heading back to the pickup point.',
            ['ride_id' => $ride->id, 'status' => $ride->status],
        );

        return $this->success($ride, 'Return leg started');
    }

    /**
     * Driver rejects the ride
     */
    public function rejectRide(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride || $ride->status !== 'REQUESTED') {
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

        // A return trip can complete from WAITING (ends at the destination
        // without the return leg - billed only for the outbound distance, see
        // FareCalculationService::completionBreakdown()) or RETURNING (full
        // round trip). A one-way ride only ever completes from STARTED.
        if (! $ride || ! in_array($ride->status, ['STARTED', 'WAITING', 'RETURNING'], true)) {
            return $this->error('Ride cannot be completed', 400);
        }

        $driver = $request->user()->driver;

        if (! $driver || $ride->driver_id !== $driver->id) {
            return $this->error('You are not authorized to complete this ride', 403);
        }

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::COMPLETED,
                'Driver completed the ride.',
            );
            $ride->update($this->fares->completionBreakdown($ride));
            $ride->refresh();

            $passenger = $ride->passenger()->with('studentVerification')->first();
            if ($passenger?->isVerifiedStudent()) {
                $adjustedFinalFare = $this->commission->studentAdjustedFare(
                    (string) $ride->final_fare,
                    $ride->fareConfig,
                );
                $ride->update(['final_fare' => $adjustedFinalFare]);
                $ride->refresh();
            }
        } catch (DomainException) {
            return $this->error('Ride cannot be completed', 409);
        }

        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        $this->notifications->notify(
            $ride->passenger->user,
            'Trip Completed',
            "Trip completed. Your total fare is Rs. {$ride->final_fare}.",
            ['ride_id' => $ride->id, 'status' => $ride->status, 'final_fare' => $ride->final_fare],
        );

        return $this->success($ride, 'Ride completed successfully');
    }

    /**
     * Cancel/Destroy the ride.
     */
    /**
     * Driver or Passenger requests to cancel a ride.
     */
    public function cancel(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride || in_array($ride->status, ['COMPLETED', 'CANCELLED'])) {
            return $this->error('Ride cannot be cancelled', 400);
        }

        if ($request->user()->cannot('cancel', $ride)) {
            return $this->error('You are not authorized to cancel this ride', 403);
        }

        $user = $request->user();
        $cancelledBy = 'passenger';
        if ($user->canActAs(User::ROLE_DRIVER) && $user->driver && $ride->driver_id !== null && (int) $user->driver->id === (int) $ride->driver_id) {
            $cancelledBy = 'driver';
        }

        $cancelReason = $request->input('cancel_reason') ?? $request->input('cancelReason');

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::CANCELLED,
                "Ride was cancelled by {$cancelledBy}.",
                [
                    'cancel_reason' => $cancelReason,
                    'cancelled_by' => $cancelledBy,
                ]
            );
        } catch (DomainException) {
            return $this->error('Ride cannot be cancelled', 409);
        }

        $this->rideMatching->cleanup($ride->id);
        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        return $this->success($ride, 'Ride cancelled successfully');
    }

    /**
     * Cancel/Destroy the ride.
     */
    public function destroy(Request $request, $id)
    {
        $ride = Ride::find($id);

        if (! $ride || in_array($ride->status, ['COMPLETED', 'CANCELLED'])) {
            return $this->error('Ride cannot be cancelled', 400);
        }

        if ($request->user()->cannot('cancel', $ride)) {
            return $this->error('You are not authorized to cancel this ride', 403);
        }

        $cancelReason = $request->input('cancel_reason') ?? $request->input('cancelReason');

        try {
            $ride = $this->rideTransition->transition(
                $ride->id,
                RideStateMachine::CANCELLED,
                'Ride was cancelled by passenger.',
                [
                    'cancel_reason' => $cancelReason,
                    'cancelled_by' => 'passenger',
                ]
            );
        } catch (DomainException) {
            return $this->error('Ride cannot be cancelled', 409);
        }

        $this->rideMatching->cleanup($ride->id);
        $ride->load(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment']);
        event(new RideStatusUpdated($ride));

        return $this->success($ride, 'Ride cancelled successfully');
    }
}
