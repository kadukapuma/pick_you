<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class DashboardUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public string $event;
    public array $data;

    public function __construct(string $event, array $data = [])
    {
        $this->event = $event;
        $this->data = $data;
    }

    public function broadcastOn(): Channel
    {
        return new Channel('admin.dashboard');
    }
}
