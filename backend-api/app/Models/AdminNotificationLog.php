<?php

namespace App\Models;

use App\Events\AdminNotification;
use Illuminate\Database\Eloquent\Model;

class AdminNotificationLog extends Model
{
    protected $table = 'admin_notifications';

    protected $guarded = ['id'];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
    ];

    public static function createAndBroadcast(
        string $type,
        string $title,
        string $message,
        array $data = []
    ): self {
        $notification = self::create([
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'is_read' => false,
        ]);

        event(new AdminNotification($notification));

        return $notification;
    }
}
