<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = Notification::all();
        return $this->success($data, 'Notification list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Notification::create($request->all());
        return $this->success($data, 'Notification created successfully.', 201);
    }

    public function show($id)
    {
        $data = Notification::find($id);
        if (!$data) return $this->error('Notification not found.', 404);
        return $this->success($data, 'Notification retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Notification::find($id);
        if (!$data) return $this->error('Notification not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Notification updated successfully.');
    }

    public function destroy($id)
    {
        $data = Notification::find($id);
        if (!$data) return $this->error('Notification not found.', 404);
        $data->delete();
        return $this->success(null, 'Notification deleted successfully.');
    }
}
