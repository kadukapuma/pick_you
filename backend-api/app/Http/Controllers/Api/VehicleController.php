<?php

namespace App\Http\Controllers\Api;

use App\Events\DashboardUpdated;
use App\Events\VehicleCreated;
use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Models\Vehicle;
use App\Models\VehicleImage;
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
        if ($request->filled('driver_id')) {
            $query->where('driver_id', $request->input('driver_id'));
        }

        $data = $query->paginate($perPage);

        return $this->success($data, 'Vehicle list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $vehicle = Vehicle::create($request->all());

        $imageFields = ['insurance_img', 'licence_img', 'v_front', 'v_back', 'v_side'];
        $hasImages = false;
        foreach ($imageFields as $field) {
            if ($request->hasFile($field)) {
                $hasImages = true;
                break;
            }
        }

        if ($hasImages) {
            $this->saveVehicleImages($request, $vehicle);
        }

        $vehicle->load(['images', 'driver.user']);

        event(new VehicleCreated($vehicle));

        $driverName = $vehicle->driver?->user
            ? trim(($vehicle->driver->user->first_name ?? '') . ' ' . ($vehicle->driver->user->last_name ?? ''))
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

    public function show($id)
    {
        $data = Vehicle::with(['driver.user', 'images'])->find($id);
        if (!$data) return $this->error('Vehicle not found.', 404);
        return $this->success($data, 'Vehicle retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Vehicle::find($id);
        if (!$data) return $this->error('Vehicle not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Vehicle updated successfully.');
    }

    public function destroy($id)
    {
        $data = Vehicle::find($id);
        if (!$data) return $this->error('Vehicle not found.', 404);
        $data->delete();
        return $this->success(null, 'Vehicle deleted successfully.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,suspended,updated'
        ]);

        $vehicle = Vehicle::with(['driver.user'])->find($id);
        if (!$vehicle) return $this->error('Vehicle not found.', 404);

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


    public function uploadImages(Request $request, $id)
    {
        $vehicle = Vehicle::find($id);
        if (!$vehicle) return $this->error('Vehicle not found.', 404);

        $this->saveVehicleImages($request, $vehicle);

        return $this->success($vehicle->load('images'), 'Images uploaded successfully.');
    }

    private function saveVehicleImages(Request $request, Vehicle $vehicle)
    {
        $driverId = $vehicle->driver_id;
        $vehicleId = $vehicle->id;

        $imageData = [
            'driver_id' => $driverId,
            'vehicle_id' => $vehicleId,
        ];

        $imageFields = ['insurance_img', 'licence_img', 'v_front', 'v_back', 'v_side'];

        foreach ($imageFields as $field) {
            if ($request->hasFile($field)) {
                $imageData[$field] = $this->uploadImageToCloudinary(
                    $request->file($field),
                    "drivers/{$driverId}/vehicles/{$vehicleId}",
                    $field
                );
            }
        }

        VehicleImage::updateOrCreate(
            ['vehicle_id' => $vehicleId],
            $imageData
        );
    }

    private function uploadImageToCloudinary($file, string $folder, string $publicId): ?string
    {
        $uploadResult = cloudinary()->uploadApi()->upload($file->getRealPath(), [
            'folder' => $folder,
            'public_id' => $publicId,
            'overwrite' => true,
            'invalidate' => true,
            'resource_type' => 'image',
        ]);

        return data_get($uploadResult, 'secure_url')
            ?? data_get($uploadResult, 'url')
            ?? null;
    }
}
