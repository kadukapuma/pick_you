<?php

namespace App\Services\RideMatching;

use App\Events\RideRequestedTargeted;
use App\Jobs\ProcessRideTimeout;
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
        $drivers = $this->driverMatchingQuery->findNearbyDrivers($pickupLat, $pickupLng, $vehicleType);

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

        $this->redis->setCurrentDriver($rideId, $driverId);

        Log::info("RideMatching: Targeting Driver {$driverId} for Ride {$rideId}");

        $ride->refresh();

        event(new RideRequestedTargeted($ride->load(['passenger.user', 'fareConfig']), $driverId));

        $offerSeconds = max(8, (int) config('ride.driver_offer_seconds', 12));

        ProcessRideTimeout::dispatch($rideId, $driverId)
            ->onQueue(config('ride.queues.rides', 'rides'))
            ->delay(now()->addSeconds($offerSeconds));
    }

    public function handleDriverRejection(int $rideId, int $driverId): void
    {
        $currentDriverId = $this->redis->getCurrentDriver($rideId);

        if ($currentDriverId === null || $currentDriverId !== $driverId) {
            return;
        }

        Log::info("RideMatching: Driver {$driverId} rejected Ride {$rideId}. Applying cooldown.");

        $this->cooldown->record($driverId);
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

            if (! $this->cooldown->isOnCooldown($driverId)) {
                return $driverId;
            }

            Log::info("RideMatching: Skipping cooled-down Driver {$driverId} for Ride {$rideId}");
        }

        return null;
    }
}
