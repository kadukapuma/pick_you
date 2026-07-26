<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $data = Notification::where('user_id', $request->user()->id)->latest()->paginate(50);

        return $this->success($data, 'Notification list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Notification::create($request->all());

        return $this->success($data, 'Notification created successfully.', 201);
    }

    public function show(Request $request, $id)
    {
        $data = Notification::find($id);
        if (! $data) {
            return $this->error('Notification not found.', 404);
        }
        if ((int) $data->user_id !== (int) $request->user()->id) {
            return $this->error('You are not authorized to view this notification.', 403);
        }

        return $this->success($data, 'Notification retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Notification::find($id);
        if (! $data) {
            return $this->error('Notification not found.', 404);
        }
        if ((int) $data->user_id !== (int) $request->user()->id) {
            return $this->error('You are not authorized to update this notification.', 403);
        }
        $data->update($request->only('is_read'));

        return $this->success($data, 'Notification updated successfully.');
    }

    public function destroy(Request $request, $id)
    {
        $data = Notification::find($id);
        if (! $data) {
            return $this->error('Notification not found.', 404);
        }
        if ((int) $data->user_id !== (int) $request->user()->id) {
            return $this->error('You are not authorized to delete this notification.', 403);
        }
        $data->delete();

        return $this->success(null, 'Notification deleted successfully.');
    }
}
