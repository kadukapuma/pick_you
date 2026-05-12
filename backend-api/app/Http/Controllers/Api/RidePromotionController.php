<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RidePromotion;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class RidePromotionController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = RidePromotion::all();
        return $this->success($data, 'RidePromotion list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = RidePromotion::create($request->all());
        return $this->success($data, 'RidePromotion created successfully.', 201);
    }

    public function show($id)
    {
        $data = RidePromotion::find($id);
        if (!$data) return $this->error('RidePromotion not found.', 404);
        return $this->success($data, 'RidePromotion retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = RidePromotion::find($id);
        if (!$data) return $this->error('RidePromotion not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'RidePromotion updated successfully.');
    }

    public function destroy($id)
    {
        $data = RidePromotion::find($id);
        if (!$data) return $this->error('RidePromotion not found.', 404);
        $data->delete();
        return $this->success(null, 'RidePromotion deleted successfully.');
    }
}
