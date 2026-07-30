<?php

namespace App\Services\Rides;

use App\Models\Ride;
use DomainException;
use Illuminate\Support\Facades\DB;

class RideTransitionService
{
    public function __construct(
        private readonly RideStateMachine $stateMachine,
    ) {}

    public function transition(
        int $rideId,
        string $toStatus,
        string $notes,
        array $attributes = [],
    ): Ride {
        return DB::transaction(function () use ($rideId, $toStatus, $notes, $attributes) {
            $ride = Ride::query()->lockForUpdate()->findOrFail($rideId);

            if (! $this->stateMachine->canTransition((string) $ride->status, $toStatus)) {
                throw new DomainException(
                    "Ride cannot transition from {$ride->status} to {$toStatus}."
                );
            }

            $ride->update([
                ...$attributes,
                'status' => $toStatus,
                ...$this->timestampFor($toStatus),
            ]);

            $ride->statuses()->create([
                'status' => $toStatus,
                'notes' => $notes,
            ]);

            $driverId = $attributes['driver_id'] ?? $ride->driver_id;
            if ($driverId) {
                try {
                    if (in_array($toStatus, [RideStateMachine::ACCEPTED, RideStateMachine::ARRIVED, RideStateMachine::STARTED], true)) {
                        \Illuminate\Support\Facades\Redis::setex("driver:active_ride:{$driverId}", 86400, (string) $ride->id);
                    } elseif (in_array($toStatus, [RideStateMachine::COMPLETED, RideStateMachine::CANCELLED], true)) {
                        \Illuminate\Support\Facades\Redis::del("driver:active_ride:{$driverId}");
                    }
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning('Could not sync driver active ride to Redis.', [
                        'driver_id' => $driverId,
                        'ride_id' => $ride->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            return $ride->refresh();
        }, 3);
    }

    private function timestampFor(string $status): array
    {
        return match ($status) {
            RideStateMachine::ACCEPTED => ['accepted_at' => now()],
            RideStateMachine::ARRIVED => ['arrived_at' => now()],
            RideStateMachine::STARTED => ['started_at' => now()],
            RideStateMachine::COMPLETED => ['completed_at' => now()],
            RideStateMachine::CANCELLED => ['cancelled_at' => now()],
            default => [],
        };
    }
}
