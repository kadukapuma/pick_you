<?php

namespace App\Http\Controllers\Api;

use App\Events\DashboardUpdated;
use App\Events\VehicleCreated;
use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Models\User;
use App\Models\Vehicle;
use App\Models\VehicleImage;
use App\Services\Media\ImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class VehicleController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $query = Vehicle::with(['driver.user'])->orderByDesc('id');
        if ($request->user()?->canActAs(User::ROLE_DRIVER)) {
            $query->where('driver_id', $request->user()->driver->id);
        } elseif (! $request->user()?->hasPermission('manage_vehicles')) {
            return $this->error('You are not authorized to view vehicles.', 403);
        }
        if ($request->filled('driver_id')) {
            $query->where('driver_id', $request->input('driver_id'));
        }

        $search = trim((string) $request->input('search', $request->input('q', '')));
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('vehicle_number', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%")
                    ->orWhere('color', 'like', "%{$search}%")
                    ->orWhereHas('driver.user', function ($uq) use ($search) {
                        $uq->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('phone', 'like', "%{$search}%");
                    });
            });
        }

        $data = $query->paginate($perPage);

        return $this->success($data, 'Vehicle list retrieved successfully.');
    }

    public function store(Request $request, ImageStorageService $images)
    {
        $attributes = $request->all();
        if ($request->user()?->canActAs(User::ROLE_DRIVER)) {
            $attributes['driver_id'] = $request->user()->driver->id;
        } elseif (! $request->user()?->hasPermission('manage_vehicles')) {
            return $this->error('You are not authorized to create vehicles.', 403);
        }
        $vehicle = Vehicle::create($attributes);

        $imageFields = ['insurance_img', 'licence_img', 'v_front', 'v_back', 'v_side'];
        $hasImages = false;
        foreach ($imageFields as $field) {
            if ($request->hasFile($field)) {
                $hasImages = true;
                break;
            }
        }

        if ($hasImages) {
            $this->saveVehicleImages($request, $vehicle, $images);
        }

        $vehicle->load(['images', 'driver.user']);

        event(new VehicleCreated($vehicle));

        $driverName = $vehicle->driver?->user
            ? trim(($vehicle->driver->user->first_name ?? '').' '.($vehicle->driver->user->last_name ?? ''))
            : "Driver #{$vehicle->driver_id}";
        if ($driverName === '') {
            $driverName = "Driver #{$vehicle->driver_id}";
        }

        $vehicleNumber = $vehicle->vehicle_number ?? "Vehicle #{$vehicle->id}";

        AdminNotificationLog::createAndBroadcast(
            'vehicle',
            'New vehicle added',
            "{$vehicleNumber} added by {$driverName}.",
            ['vehicle_id' => $vehicle->id, 'driver_id' => $vehicle->driver_id]
        );

        return $this->success($vehicle, 'Vehicle created successfully.', 201);
    }

    public function show(Request $request, $id)
    {
        $data = Vehicle::with(['driver.user', 'images'])->find($id);
        if (! $data) {
            return $this->error('Vehicle not found.', 404);
        }
        if (! $this->canManage($request, $data)) {
            return $this->error('You are not authorized to view this vehicle.', 403);
        }

        return $this->success($data, 'Vehicle retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Vehicle::find($id);
        if (! $data) {
            return $this->error('Vehicle not found.', 404);
        }
        if (! $this->canManage($request, $data)) {
            return $this->error('You are not authorized to update this vehicle.', 403);
        }
        $attributes = $request->except('driver_id');
        $data->update($attributes);

        return $this->success($data, 'Vehicle updated successfully.');
    }

    public function destroy($id)
    {
        $data = Vehicle::find($id);
        if (! $data) {
            return $this->error('Vehicle not found.', 404);
        }
        $data->delete();

        return $this->success(null, 'Vehicle deleted successfully.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,suspended,updated',
        ]);

        $vehicle = Vehicle::with(['driver.user'])->find($id);
        if (! $vehicle) {
            return $this->error('Vehicle not found.', 404);
        }

        $vehicle->update(['status' => $request->status]);

        // Optionally activate/deactivate the vehicle based on status
        if ($request->status === 'approved') {
            $vehicle->update(['is_active' => true]);
        } elseif ($request->status === 'suspended') {
            $vehicle->update(['is_active' => false]);
        }

        event(new DashboardUpdated('vehicle.status', [
            'vehicle_id' => $vehicle->id,
            'status' => $request->status,
        ]));

        return $this->success($vehicle, "Vehicle status has been updated to {$request->status} successfully.");
    }

    public function uploadImages(Request $request, $id, ImageStorageService $images)
    {
        $vehicle = Vehicle::find($id);
        if (! $vehicle) {
            return $this->error('Vehicle not found.', 404);
        }
        if (! $this->canManage($request, $vehicle)) {
            return $this->error('You are not authorized to update this vehicle.', 403);
        }

        $this->saveVehicleImages($request, $vehicle, $images);

        return $this->success($vehicle->load('images'), 'Images uploaded successfully.');
    }

    private function saveVehicleImages(
        Request $request,
        Vehicle $vehicle,
        ImageStorageService $images,
    )
    {
        $driverId = $vehicle->driver_id;
        $vehicleId = $vehicle->id;
        $existingImages = $vehicle->images()->first();

        $imageData = [
            'driver_id' => $driverId,
            'vehicle_id' => $vehicleId,
        ];

        $imageFields = ['insurance_img', 'licence_img', 'v_front', 'v_back', 'v_side'];

        foreach ($imageFields as $field) {
            if ($request->hasFile($field)) {
                $imageData[$field] = $images->store(
                    $request->file($field),
                    "drivers/{$driverId}/vehicles/{$vehicleId}",
                    str_replace('_', '-', $field),
                );
            }
        }

        VehicleImage::updateOrCreate(
            ['vehicle_id' => $vehicleId],
            $imageData
        );

        foreach (array_keys($imageData) as $field) {
            if (! in_array($field, ['driver_id', 'vehicle_id'], true)) {
                $images->deleteLocal($existingImages?->{$field});
            }
        }
    }

    private function canManage(Request $request, Vehicle $vehicle): bool
    {
        return $request->user()?->hasPermission('manage_vehicles')
            || ($request->user()?->driver && (int) $request->user()->driver->id === (int) $vehicle->driver_id);
    }
}
