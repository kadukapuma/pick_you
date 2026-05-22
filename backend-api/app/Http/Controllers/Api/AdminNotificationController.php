<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class AdminNotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $limit = $request->integer('limit', 20);
        if ($limit < 1) {
            $limit = 20;
        }
        $limit = min($limit, 100);

        $notifications = AdminNotificationLog::orderByDesc('created_at')
            ->limit($limit)
            ->get()
            ->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'type' => $notification->type,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'data' => $notification->data,
                    'is_read' => (bool) $notification->is_read,
                    'created_at' => $notification->created_at->toIso8601String(),
                ];
            });

        return $this->success($notifications, 'Admin notifications retrieved successfully.');
    }

    public function markAllRead()
    {
        $updated = AdminNotificationLog::where('is_read', false)->update([
            'is_read' => true,
        ]);

        return $this->success(['updated' => $updated], 'Notifications marked as read.');
    }

    public function clear()
    {
        $deleted = AdminNotificationLog::query()->delete();
        return $this->success(['deleted' => $deleted], 'Notifications cleared.');
    }

    public function clearRead()
    {
        $deleted = AdminNotificationLog::where('is_read', true)->delete();
        return $this->success(['deleted' => $deleted], 'Read notifications cleared.');
    }
}
