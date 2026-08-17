<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use App\Services\Notifications\ExpoPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendExpoPushNotification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $userId,
        public readonly string $title,
        public readonly string $body,
        public readonly array $data = [],
    ) {
        $this->onQueue(config('notifications.queue', 'notifications'));
    }

    public function handle(ExpoPushService $expoPush): void
    {
        $deviceTokens = DeviceToken::where('user_id', $this->userId)->get();

        $expoPush->sendToTokens($deviceTokens, $this->title, $this->body, $this->data);
    }
}
