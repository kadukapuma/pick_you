<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use App\Models\Ride;
use Illuminate\Support\Facades\Redis;
use App\Http\Controllers\Api\RideController;
use Illuminate\Support\Facades\Log;

class ProcessRideTimeout implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $rideId;
    protected int $driverId;

    /**
     * Create a new job instance.
     */
    public function __construct(int $rideId, int $driverId)
    {
        $this->rideId = $rideId;
        $this->driverId = $driverId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $ride = Ride::find($this->rideId);
        if (!$ride || $ride->status !== 'REQUESTED') {
            Log::info("ProcessRideTimeout: Ride {$this->rideId} is no longer in REQUESTED status.");
            return;
        }

        $currentDriverId = Redis::get("ride:current_driver:{$this->rideId}");
        
        if ($currentDriverId !== null && (int)$currentDriverId === $this->driverId) {
            Log::info("ProcessRideTimeout: Driver {$this->driverId} timed out on Ride {$this->rideId}. Moving to next driver.");
            
            // Advance to the next driver
            $controller = new RideController();
            $controller->targetNextDriver($this->rideId);
        } else {
            Log::info("ProcessRideTimeout: Driver {$this->driverId} is no longer targeted for Ride {$this->rideId}. Current: {$currentDriverId}");
        }
    }
}
