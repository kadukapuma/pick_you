<?php

namespace App\Services\Notifications;

use App\Jobs\SendExpoPushNotification;
use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    /**
     * Persist an in-app notification for the user and dispatch a push send in the background.
     */
    public function notify(User $user, string $title, string $message, array $data = [], bool $saveToDb = false): ?Notification
    {
        $notification = null;
        if ($saveToDb) {
            $notification = Notification::create([
                'user_id' => $user->id,
                'title' => $title,
                'message' => $message,
                'is_read' => false,
            ]);
        }

        SendExpoPushNotification::dispatch($user->id, $title, $message, $data);

        return $notification;
    }
}
