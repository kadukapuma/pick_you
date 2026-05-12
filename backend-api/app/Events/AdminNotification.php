<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use App\Models\AdminNotificationLog;

class AdminNotification implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public int $id;
    public string $type;
    public string $title;
    public string $message;
    public array $data;
    public bool $is_read;
    public string $created_at;

    public function __construct(AdminNotificationLog $notification)
    {
        $this->id = $notification->id;
        $this->type = $notification->type;
        $this->title = $notification->title;
        $this->message = $notification->message ?? '';
        $this->data = $notification->data ?? [];
        $this->is_read = (bool) $notification->is_read;
        $this->created_at = $notification->created_at
            ? $notification->created_at->toISOString()
            : now()->toISOString();
    }

    public function broadcastOn(): Channel
    {
        return new Channel('admin.notifications');
    }
}
