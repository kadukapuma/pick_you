<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use App\Services\Notifications\ExpoPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendExpoPushTokensChunkJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly array $deviceTokenIds,
        public readonly string $title,
        public readonly string $body,
        public readonly array $data = []
    ) {
        $this->onQueue(config('notifications.queue', 'notifications'));
    }

    public function handle(ExpoPushService $expoPush): void
    {
        $deviceTokens = DeviceToken::whereIn('id', $this->deviceTokenIds)->get();
        if ($deviceTokens->isNotEmpty()) {
            $expoPush->sendToTokens($deviceTokens, $this->title, $this->body, $this->data);
        }
    }
}
