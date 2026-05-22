<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\DashboardUpdated;
use App\Events\DriverCreated;
use App\Models\Driver;
use App\Models\AdminNotificationLog;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use App\Mail\DriverApprovedMail;
use App\Mail\DriverSuspendedMail;

class DriverController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $data = Driver::with(['user', 'vehicles.images'])
            ->withCount('rides')
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->success($data, 'Driver list retrieved successfully.');
    }

    public function store(Request $request)
    {
        $data = Driver::create($request->all());
        $driver = Driver::with(['user', 'vehicles.images'])->withCount('rides')->find($data->id);

        event(new DriverCreated($driver));

        $driverName = $driver?->user
            ? trim(($driver->user->first_name ?? '') . ' ' . ($driver->user->last_name ?? ''))
            : "Driver #{$driver->id}";
        if ($driverName === '') {
            $driverName = "Driver #{$driver->id}";
        }

        AdminNotificationLog::createAndBroadcast(
            'driver',
            'New driver added',
            "{$driverName} profile created.",
            ['driver_id' => $driver->id]
        );

        return $this->success($driver, 'Driver created successfully.', 201);
    }

    public function show($id)
    {
        $data = Driver::with(['user', 'vehicles.images'])->withCount('rides')->find($id);
        if (!$data) return $this->error('Driver not found.', 404);
        return $this->success($data, 'Driver retrieved successfully.');
    }

    public function update(Request $request, $id)
    {
        $data = Driver::find($id);
        if (!$data) return $this->error('Driver not found.', 404);
        $data->update($request->all());
        return $this->success($data, 'Driver updated successfully.');
    }

    public function destroy($id)
    {
        $data = Driver::find($id);
        if (!$data) return $this->error('Driver not found.', 404);
        $data->delete();
        return $this->success(null, 'Driver deleted successfully.');
    }

    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:pending,approved,suspended,updated,rejected'
        ]);

        $driver = Driver::with(['user', 'vehicles.images'])->withCount('rides')->find($id);
        if (!$driver) return $this->error('Driver not found.', 404);

        $driver->update(['status' => $request->status]);

        // Also activate the driver's user account if approved
        if ($request->status === 'approved' && $driver->user) {
            $driver->user->update(['is_active' => true]);

            // Send approval email
            if ($driver->user->email) {
                Mail::to($driver->user->email)->send(new DriverApprovedMail($driver));
            }
        } elseif ($request->status === 'suspended' && $driver->user) {
            $driver->user->update(['is_active' => false]);

            // Send suspended email
            if ($driver->user->email) {
                Mail::to($driver->user->email)->send(new DriverSuspendedMail($driver));
            }
        }

        event(new DashboardUpdated('driver.status', [
            'driver_id' => $driver->id,
            'status' => $request->status,
        ]));

        return $this->success($driver, "Driver status has been updated to {$request->status} successfully.");
    }

    public function updateActiveStatus(Request $request, $id)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $driver = Driver::with('user')->find($id);
        if (!$driver) return $this->error('Driver not found.', 404);

        if ($driver->user) {
            $driver->user->update(['is_active' => $request->is_active]);
        }

        event(new DashboardUpdated('driver.account', [
            'driver_id' => $driver->id,
            'is_active' => (bool) $request->is_active,
        ]));

        return $this->success($driver, 'Driver account status updated successfully.');
    }

    public function completeProfile(Request $request)
    {
        $request->validate([
            'dob' => 'nullable|date',
            'address' => 'nullable|string',
            'nic' => 'nullable|string',
            'make' => 'nullable|string',
            'model' => 'nullable|string',
            'year' => 'nullable|string',
            'color' => 'nullable|string',
            'plate' => 'nullable|string',
            'vehicleType' => 'nullable|string',
            'vehicle_type_id' => 'nullable|integer|exists:vehicle_types,id',
            'front' => 'nullable|file',
            'back' => 'nullable|file',
            'interior' => 'nullable|file',
            'insurance' => 'nullable|file',
            'registration' => 'nullable|file',
            'license_front' => 'nullable|file',
            'license_back' => 'nullable|file',
        ]);

        $user = $request->user();
        if (!$user->driver) {
            $driver = $user->driver()->create([]);
        } else {
            $driver = $user->driver;
        }

        $basePath = "uploads/users/{$user->id}/vehicles";
        $fullPath = public_path($basePath);

        if (!File::exists($fullPath)) {
            File::makeDirectory($fullPath, 0755, true);
        }

        $uploadFile = function ($fileKey) use ($request, $fullPath, $basePath) {
            if ($request->hasFile($fileKey)) {
                $file = $request->file($fileKey);
                $fileName = $fileKey . '_' . time() . '.' . $file->getClientOriginalExtension();
                $file->move($fullPath, $fileName);
                return "{$basePath}/{$fileName}";
            }
            return null;
        };

        $updateData = [
            'status' => 'pending',
            'dob' => $request->filled('dob') ? $request->dob : $driver->dob,
            'address' => $request->filled('address') ? $request->address : $driver->address,
            'license_number' => $request->filled('nic') ? trim((string) $request->nic) : $driver->license_number,
            'license_front_path' => $request->hasFile('license_front') ? $uploadFile('license_front') : $driver->license_front_path,
            'license_back_path' => $request->hasFile('license_back') ? $uploadFile('license_back') : $driver->license_back_path,
        ];

        $driver->update($updateData);

        // Resolve vehicle type ID and name string
        $vehicleTypeId = $request->vehicle_type_id;
        $vehicleTypeStr = $request->vehicleType;

        if ($vehicleTypeId) {
            $foundType = \App\Models\VehicleType::find($vehicleTypeId);
            if ($foundType) {
                $vehicleTypeStr = $foundType->name;
            }
        } elseif ($vehicleTypeStr) {
            $foundType = \App\Models\VehicleType::where('name', strtolower($vehicleTypeStr))->first();
            if ($foundType) {
                $vehicleTypeId = $foundType->id;
                $vehicleTypeStr = $foundType->name;
            }
        }

        $vehicleData = array_filter([
            'brand' => $request->make,
            'model' => $request->model,
            'year' => $request->year,
            'color' => $request->color,
            'vehicle_number' => $request->plate,
            'vehicle_type_id' => $vehicleTypeId,
            'seat_capacity' => $request->seat_capacity,
        ]);

        if (!empty($vehicleData)) {
            $vehicle = $driver->vehicles()->updateOrCreate(
                ['driver_id' => $driver->id],
                $vehicleData
            );
        } else {
            $vehicle = $driver->vehicles()->first();
        }

        if ($vehicle) {
            $imageData = array_filter([
                'v_front' => $uploadFile('front'),
                'v_back' => $uploadFile('back'),
                'v_side' => $uploadFile('interior'),
                'insurance_img' => $uploadFile('insurance'),
                'licence_img' => $uploadFile('registration'),
            ]);

            if (!empty($imageData)) {
                $vehicle->images()->updateOrCreate(
                    ['vehicle_id' => $vehicle->id],
                    array_merge(['driver_id' => $driver->id], $imageData)
                );
            }
        }

        return $this->success($driver->load('vehicles.images'), 'Profile completed successfully.');
    }

    public function updateLicenseImages(Request $request)
    {
        $request->validate([
            'license_front' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'license_back' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();
        $driver = $user->driver;

        if (!$driver) {
            return $this->error('Driver profile not found', 404);
        }

        $userId = $user->id;
        $basePath = "uploads/users/{$userId}/license";
        $fullPath = public_path($basePath);

        if (!File::exists($fullPath)) {
            File::makeDirectory($fullPath, 0755, true);
        }

        $updatedData = [];

        if ($request->hasFile('license_front')) {
            $file = $request->file('license_front');
            $fileName = 'license_front_' . time() . '.' . $file->getClientOriginalExtension();

            if ($driver->license_front_path && File::exists(public_path($driver->license_front_path))) {
                File::delete(public_path($driver->license_front_path));
            }

            $file->move($fullPath, $fileName);
            $updatedData['license_front_path'] = "{$basePath}/{$fileName}";
        }

        if ($request->hasFile('license_back')) {
            $file = $request->file('license_back');
            $fileName = 'license_back_' . time() . '.' . $file->getClientOriginalExtension();

            if ($driver->license_back_path && File::exists(public_path($driver->license_back_path))) {
                File::delete(public_path($driver->license_back_path));
            }

            $file->move($fullPath, $fileName);
            $updatedData['license_back_path'] = "{$basePath}/{$fileName}";
        }

        if (!empty($updatedData)) {
            $driver->update($updatedData);
        }

        return $this->success($driver, 'License images updated successfully');
    }
}
