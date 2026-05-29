<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleType;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class VehicleTypeController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = VehicleType::orderBy('id');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        $data = $query->get()->map(function ($vt) {
            $vt->fare_config = \App\Models\FareConfig::where('vehicle_type', $vt->name)->where('is_active', true)->first();
            return $vt;
        });

        return $this->success($data, 'Vehicle types retrieved successfully.');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:50|unique:vehicle_types,name',
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $vehicleType = VehicleType::create($request->all());

        return $this->success($vehicleType, 'Vehicle type created successfully.', 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $vehicleType = VehicleType::find($id);
        if (!$vehicleType) {
            return $this->error('Vehicle type not found.', 404);
        }
        return $this->success($vehicleType, 'Vehicle type retrieved successfully.');
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        $vehicleType = VehicleType::find($id);
        if (!$vehicleType) {
            return $this->error('Vehicle type not found.', 404);
        }

        $request->validate([
            'name' => 'required|string|max:50|unique:vehicle_types,name,' . $id,
            'display_name' => 'required|string|max:100',
            'description' => 'nullable|string',
            'is_active' => 'boolean',
        ]);

        $vehicleType->update($request->all());

        return $this->success($vehicleType, 'Vehicle type updated successfully.');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $vehicleType = VehicleType::find($id);
        if (!$vehicleType) {
            return $this->error('Vehicle type not found.', 404);
        }

        // Integrity safety checks: make sure no vehicle or fare config is using this string
        $hasVehicles = \App\Models\Vehicle::where('vehicle_type_id', $vehicleType->id)->exists();
        $hasFareConfigs = \App\Models\FareConfig::where('vehicle_type', $vehicleType->name)->exists();

        if ($hasVehicles || $hasFareConfigs) {
            return $this->error('Cannot delete vehicle type because it is currently used by vehicles or fare configurations.', 400);
        }

        $vehicleType->delete();

        return $this->success(null, 'Vehicle type deleted successfully.');
    }
}
