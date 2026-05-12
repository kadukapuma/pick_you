<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = Promotion::all();
        return $this->success($data, 'Promotion list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Promotion::create($request->all());
        return $this->success($data, 'Promotion created successfully.', 201);
    }

    public function show($id)
    {
        $data = Promotion::find($id);
        if (!$data) return $this->error('Promotion not found.', 404);
        return $this->success($data, 'Promotion retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Promotion::find($id);
        if (!$data) return $this->error('Promotion not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Promotion updated successfully.');
    }

    public function destroy($id)
    {
        $data = Promotion::find($id);
        if (!$data) return $this->error('Promotion not found.', 404);
        $data->delete();
        return $this->success(null, 'Promotion deleted successfully.');
    }
}
