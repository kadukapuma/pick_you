<?php

namespace App\Events;

use App\Models\Ride;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RideStatusUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $ride;

    public function __construct(Ride $ride)
    {
        $this->ride = $ride->loadMissing(['passenger.user', 'driver.user', 'vehicle', 'fareConfig', 'payment'])->toArray();
    }

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('ride.'.$this->ride['id']);
    }

    public function broadcastAs(): string
    {
        return 'RideStatusUpdated';
    }
}
