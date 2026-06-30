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
        $data = FareConfig::create($this->validatedPayload($request));
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
        $data->update($this->validatedPayload($request, $data->id));
        return $this->success($data, 'FareConfig updated successfully.');
    }

    public function destroy($id)
    {
        $data = FareConfig::find($id);
        if (!$data) return $this->error('FareConfig not found.', 404);
        $data->delete();
        return $this->success(null, 'FareConfig deleted successfully.');
    }

    private function validatedPayload(Request $request, ?int $ignoreId = null): array
    {
        $payload = $request->validate([
            'vehicle_type' => ['required', 'string', 'max:255'],
            'base_fare' => ['required', 'numeric', 'min:0'],
            'per_km_rate' => ['required', 'numeric', 'min:0'],
            'per_minute_rate' => ['required', 'numeric', 'min:0'],
            'cancellation_fee' => ['required', 'numeric', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $payload['is_active'] = (bool) ($payload['is_active'] ?? false);

        if ($payload['is_active']) {
            $duplicate = FareConfig::query()
                ->where('vehicle_type', $payload['vehicle_type'])
                ->where('is_active', true)
                ->when($ignoreId, fn ($query) => $query->where('id', '<>', $ignoreId))
                ->exists();

            if ($duplicate) {
                abort(response()->json([
                    'status' => 'error',
                    'message' => 'An active fare configuration already exists for this vehicle type.',
                ], 422));
            }
        }

        return $payload;
    }
}
