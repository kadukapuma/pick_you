<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Rating;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = Rating::all();
        return $this->success($data, 'Rating list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Rating::create($request->all());
        return $this->success($data, 'Rating created successfully.', 201);
    }

    public function show($id)
    {
        $data = Rating::find($id);
        if (!$data) return $this->error('Rating not found.', 404);
        return $this->success($data, 'Rating retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Rating::find($id);
        if (!$data) return $this->error('Rating not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Rating updated successfully.');
    }

    public function destroy($id)
    {
        $data = Rating::find($id);
        if (!$data) return $this->error('Rating not found.', 404);
        $data->delete();
        return $this->success(null, 'Rating deleted successfully.');
    }
}
