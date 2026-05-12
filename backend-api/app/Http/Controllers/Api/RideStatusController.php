<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RideStatus;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class RideStatusController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = RideStatus::all();
        return $this->success($data, 'RideStatus list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = RideStatus::create($request->all());
        return $this->success($data, 'RideStatus created successfully.', 201);
    }

    public function show($id)
    {
        $data = RideStatus::find($id);
        if (!$data) return $this->error('RideStatus not found.', 404);
        return $this->success($data, 'RideStatus retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = RideStatus::find($id);
        if (!$data) return $this->error('RideStatus not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'RideStatus updated successfully.');
    }

    public function destroy($id)
    {
        $data = RideStatus::find($id);
        if (!$data) return $this->error('RideStatus not found.', 404);
        $data->delete();
        return $this->success(null, 'RideStatus deleted successfully.');
    }
}
