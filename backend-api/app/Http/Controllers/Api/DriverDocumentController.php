<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverDocument;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class DriverDocumentController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $data = DriverDocument::where('driver_id', $request->user()->driver->id)->get();

        return $this->success($data, 'DriverDocument list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = DriverDocument::create([
            ...$request->all(),
            'driver_id' => $request->user()->driver->id,
            'is_verified' => false,
        ]);

        return $this->success($data, 'DriverDocument created successfully.', 201);
    }

    public function show(Request $request, $id)
    {
        $data = DriverDocument::find($id);
        if (! $data) {
            return $this->error('DriverDocument not found.', 404);
        }
        if ((int) $data->driver_id !== (int) $request->user()->driver->id) {
            return $this->error('You are not authorized to view this document.', 403);
        }

        return $this->success($data, 'DriverDocument retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = DriverDocument::find($id);
        if (! $data) {
            return $this->error('DriverDocument not found.', 404);
        }
        if ((int) $data->driver_id !== (int) $request->user()->driver->id) {
            return $this->error('You are not authorized to update this document.', 403);
        }
        $data->update($request->except(['driver_id', 'is_verified']));

        return $this->success($data, 'DriverDocument updated successfully.');
    }

    public function destroy(Request $request, $id)
    {
        $data = DriverDocument::find($id);
        if (! $data) {
            return $this->error('DriverDocument not found.', 404);
        }
        if ((int) $data->driver_id !== (int) $request->user()->driver->id) {
            return $this->error('You are not authorized to delete this document.', 403);
        }
        $data->delete();

        return $this->success(null, 'DriverDocument deleted successfully.');
    }
}
