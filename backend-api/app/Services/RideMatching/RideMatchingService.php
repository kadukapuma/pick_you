<?php

namespace App\Services\RideMatching;

use App\Events\RideRequestedTargeted;
use App\Jobs\ProcessRideTimeout;
use App\Jobs\SendExpoPushNotification;
use App\Models\Driver;
use App\Models\Ride;
use Illuminate\Support\Facades\Log;

class RideMatchingService
{
    public function __construct(
        private readonly DriverMatchingQuery $driverMatchingQuery,
        private readonly RideMatchingRedis $redis,
        private readonly DriverRejectionCooldown $cooldown,
    ) {}

    /**
     * Build the Redis matching queue and target the first driver.
     */
    public function startMatching(Ride $ride, float $pickupLat, float $pickupLng, string $vehicleType): bool
    {
        $drivers = $this->driverMatchingQuery->findNearbyDrivers($pickupLat, $pickupLng, $vehicleType, $ride->id);

        if ($drivers->isEmpty()) {
            Log::info("RideMatching: No eligible drivers for Ride {$ride->id} within radius.");

            return false;
        }

        $driverIds = $drivers->pluck('driver_id')->map(fn ($id) => (int) $id)->all();

        $this->redis->pushMatchingDrivers($ride->id, $driverIds);

        Log::info(
            'RideMatching: Queued ' . count($driverIds) . " drivers for Ride {$ride->id}. Candidates: " . implode(',', $driverIds)
        );

        $this->targetNextDriver($ride->id);

        return true;
    }

    /**
     * Target the next nearest driver in the Redis matching queue.
     */
    public function targetNextDriver(int $rideId): void
    {
        $ride = Ride::find($rideId);

        if (! $ride || $ride->status !== 'REQUESTED') {
            Log::info("RideMatching: Ride {$rideId} is no longer requested. Cleaning up Redis.");
            $this->redis->cleanup($rideId);

            return;
        }

        $driverId = $this->popEligibleDriver($rideId);

        if ($driverId === null) {
            Log::info("RideMatching: No candidate drivers left for Ride {$rideId}. Cancelling ride.");

            $ride->update([
                'status' => 'CANCELLED',
                'cancelled_at' => now(),
            ]);

            $ride->statuses()->create([
                'status' => 'CANCELLED',
                'notes' => 'No drivers available near passenger location.',
            ]);

            $this->redis->cleanup($rideId);

            return;
        }

        $offerSeconds = max(8, (int) config('ride.driver_offer_seconds', 20));
        $offerExpiresAt = now()->addSeconds($offerSeconds);

        $this->redis->setCurrentDriver($rideId, $driverId, $offerExpiresAt->toISOString());

        Log::info("RideMatching: Targeting Driver {$driverId} for Ride {$rideId}");

        $ride->refresh();

        event(new RideRequestedTargeted($ride->load(['passenger.user', 'fareConfig']), $driverId, $offerExpiresAt));

        $this->notifyDriverOfOffer($ride, $driverId, $offerExpiresAt);

        ProcessRideTimeout::dispatch($rideId, $driverId)
            ->onQueue(config('ride.queues.rides', 'rides'))
            ->delay($offerExpiresAt);
    }

    /**
     * Push a background alert to the targeted driver so the offer is visible
     * even when the app isn't in the foreground (the live WebSocket event
     * above only reaches drivers with the app open).
     */
    private function notifyDriverOfOffer(Ride $ride, int $driverId, \DateTimeInterface $offerExpiresAt): void
    {
        $driver = Driver::find($driverId);

        if (! $driver?->user_id) {
            return;
        }

        SendExpoPushNotification::dispatch(
            $driver->user_id,
            'New ride request',
            $ride->pickup_address ? "Pickup: {$ride->pickup_address}" : 'Tap to view the ride details.',
            [
                'action' => 'ride_offer',
                'ride_id' => $ride->id,
                'expires_at' => $offerExpiresAt->format(DATE_ATOM),
            ],
        );
    }

    public function handleDriverRejection(int $rideId, int $driverId): void
    {
        $currentDriverId = $this->redis->getCurrentDriver($rideId);

        if ($currentDriverId !== null && $currentDriverId !== $driverId) {
            Log::warning("RideMatching: Driver {$driverId} rejected Ride {$rideId}, but current driver is {$currentDriverId}.");
            return;
        }

        Log::info("RideMatching: Driver {$driverId} rejected Ride {$rideId}. Applying cooldown and targeting next driver.");

        $this->cooldown->record($driverId, $rideId);
        $this->targetNextDriver($rideId);
    }

    public function cleanup(int $rideId): void
    {
        $this->redis->cleanup($rideId);
        Log::info("RideMatching: Cleaned up Redis keys for Ride {$rideId}");
    }

    /**
     * Skip drivers on rejection cooldown that may still be in the queue.
     */
    private function popEligibleDriver(int $rideId): ?int
    {
        $maxAttempts = max(1, $this->redis->matchingQueueLength($rideId));

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            $driverId = $this->redis->popNextDriver($rideId);

            if ($driverId === null) {
                return null;
            }

            if (! $this->cooldown->isOnCooldown($driverId, $rideId)) {
                return $driverId;
            }

            Log::info("RideMatching: Skipping cooled-down Driver {$driverId} for Ride {$rideId}");
        }

        return null;
    }
}
