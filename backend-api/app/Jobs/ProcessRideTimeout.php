<?php

namespace App\Jobs;

use App\Models\Ride;
use App\Services\RideMatching\RideMatchingRedis;
use App\Services\RideMatching\RideMatchingService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessRideTimeout implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public int $timeout = 30;

    protected int $rideId;

    protected int $driverId;

    public function __construct(int $rideId, int $driverId)
    {
        $this->rideId = $rideId;
        $this->driverId = $driverId;
        $this->onQueue(config('ride.queues.rides', 'rides'));
    }

    public function handle(RideMatchingService $rideMatching, RideMatchingRedis $rideMatchingRedis): void
    {
        $ride = Ride::find($this->rideId);

        if (! $ride || $ride->status !== 'REQUESTED') {
            Log::info("ProcessRideTimeout: Ride {$this->rideId} is no longer in REQUESTED status.");

            return;
        }

        $currentDriverId = $rideMatchingRedis->getCurrentDriver($this->rideId);

        if ($currentDriverId !== null && $currentDriverId === $this->driverId) {
            Log::info("ProcessRideTimeout: Driver {$this->driverId} timed out on Ride {$this->rideId}. Moving to next driver.");
            $rideMatching->targetNextDriver($this->rideId);
        } else {
            Log::info("ProcessRideTimeout: Driver {$this->driverId} is no longer targeted for Ride {$this->rideId}. Current: {$currentDriverId}");
        }
    }
}
