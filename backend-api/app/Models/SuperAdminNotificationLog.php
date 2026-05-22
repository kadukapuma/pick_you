<?php

namespace App\Models;

use App\Events\SuperAdminNotification;
use Illuminate\Database\Eloquent\Model;

class SuperAdminNotificationLog extends Model
{
    protected $table = 'super_admin_notifications';

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

        event(new SuperAdminNotification($notification));

        return $notification;
    }
}
