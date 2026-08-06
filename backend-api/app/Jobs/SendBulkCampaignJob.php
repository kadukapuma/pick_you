<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use App\Models\Notification;
use App\Models\User;
use App\Jobs\SendExpoPushTokensChunkJob;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendBulkCampaignJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly string $target,
        public readonly string $title,
        public readonly string $body,
        public readonly array $data = []
    ) {
        $this->onQueue(config('notifications.queue', 'notifications'));
    }

    public function handle(): void
    {
        // 1. Build query to select target users
        $userQuery = User::query();

        if ($this->target === 'driver') {
            $userQuery->where(function ($q) {
                $q->where('role', User::ROLE_DRIVER)
                  ->orWhereHas('roles', function ($sub) {
                      $sub->where('role', User::ROLE_DRIVER)->where('is_active', true);
                  });
            });
        } elseif ($this->target === 'passenger') {
            $userQuery->where(function ($q) {
                $q->where('role', User::ROLE_PASSENGER)
                  ->orWhereHas('roles', function ($sub) {
                      $sub->where('role', User::ROLE_PASSENGER)->where('is_active', true);
                  });
            });
        } else {
            // target === 'all'
            $userQuery->where(function ($q) {
                $q->whereIn('role', [User::ROLE_DRIVER, User::ROLE_PASSENGER])
                  ->orWhereHas('roles', function ($sub) {
                      $sub->whereIn('role', [User::ROLE_DRIVER, User::ROLE_PASSENGER])->where('is_active', true);
                  });
            });
        }

        // 1. Create a single global notification record for this campaign
        Notification::create([
            'user_id' => null,
            'target' => $this->target,
            'title' => $this->title,
            'message' => $this->body,
            'is_read' => true,
        ]);

        // 2. Process users in chunks to dispatch push notifications
        $userQuery->chunk(500, function ($users) {
            // Fetch device tokens for the current chunk of users
            $userIds = $users->pluck('id');
            $deviceTokenQuery = DeviceToken::whereIn('user_id', $userIds);

            if (in_array($this->target, ['driver', 'passenger'], true)) {
                $deviceTokenQuery->where(function ($q) {
                    $q->where('app', $this->target)
                      ->orWhereNull('app');
                });
            }

            $deviceTokenIds = $deviceTokenQuery->pluck('id')->toArray();

            if (!empty($deviceTokenIds)) {
                // Split device tokens into chunks of 100 (Expo maximum request size)
                foreach (array_chunk($deviceTokenIds, 100) as $tokenIdsChunk) {
                    SendExpoPushTokensChunkJob::dispatch($tokenIdsChunk, $this->title, $this->body, $this->data);
                }
            }
        });
    }
}
