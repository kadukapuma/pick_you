<?php

namespace App\Events;

use App\Models\Passenger;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PassengerCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public Passenger $passenger;

    public function __construct(Passenger $passenger)
    {
        $this->passenger = $passenger;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('admin.passengers');
    }
}
