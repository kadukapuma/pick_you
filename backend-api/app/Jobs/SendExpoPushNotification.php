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
        public readonly ?string $app = null,
    ) {
        $this->onQueue(config('notifications.queue', 'notifications'));
    }

    public function handle(ExpoPushService $expoPush): void
    {
        $deviceTokenQuery = DeviceToken::where('user_id', $this->userId);

        // A user can hold device tokens for both apps (e.g. a driver who also
        // has a passenger profile) - scope to the intended app so a
        // passenger-only ride update never reaches that same person's
        // DriverApp device, and vice versa. Both apps now always send `app`
        // on registration, so a row with no `app` tag is a stale token from
        // before that (or a failed re-registration) - excluded rather than
        // guessed at, since it'll be re-tagged correctly the next time that
        // app opens and re-registers its token.
        if ($this->app !== null) {
            $deviceTokenQuery->where('app', $this->app);
        }

        $deviceTokens = $deviceTokenQuery->get();

        $expoPush->sendToTokens($deviceTokens, $this->title, $this->body, $this->data);
    }
}
