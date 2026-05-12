<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FareConfig;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class FareConfigController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = FareConfig::all();
        return $this->success($data, 'FareConfig list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = FareConfig::create($request->all());
        return $this->success($data, 'FareConfig created successfully.', 201);
    }

    public function show($id)
    {
        $data = FareConfig::find($id);
        if (!$data) return $this->error('FareConfig not found.', 404);
        return $this->success($data, 'FareConfig retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = FareConfig::find($id);
        if (!$data) return $this->error('FareConfig not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'FareConfig updated successfully.');
    }

    public function destroy($id)
    {
        $data = FareConfig::find($id);
        if (!$data) return $this->error('FareConfig not found.', 404);
        $data->delete();
        return $this->success(null, 'FareConfig deleted successfully.');
    }
}
