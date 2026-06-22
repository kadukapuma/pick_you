<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverDocument;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DriverDocumentController extends Controller
{
    use ApiResponse;

    public function index()
    {
        $data = DriverDocument::all();
        return $this->success($data, 'DriverDocument list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = DriverDocument::create($request->all());
        return $this->success($data, 'DriverDocument created successfully.', 201);
    }

    public function show($id)
    {
        $data = DriverDocument::find($id);
        if (!$data) return $this->error('DriverDocument not found.', 404);
        return $this->success($data, 'DriverDocument retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = DriverDocument::find($id);
        if (!$data) return $this->error('DriverDocument not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'DriverDocument updated successfully.');
    }

    public function destroy($id)
    {
        $data = DriverDocument::find($id);
        if (!$data) return $this->error('DriverDocument not found.', 404);
        $data->delete();
        return $this->success(null, 'DriverDocument deleted successfully.');
    }
}
