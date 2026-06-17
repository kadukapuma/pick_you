<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DriverLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int $ride_id,
        public readonly int $driver_id,
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly float $heading,
        public readonly float $speed,
        public readonly ?float $accuracy,
        public readonly string $recorded_at,
        public readonly int $sequence,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('ride.'.$this->ride_id);
    }

    public function broadcastAs(): string
    {
        return 'DriverLocationUpdated';
    }

    public function broadcastQueue(): string
    {
        return config('location.queue', 'locations');
    }
}
