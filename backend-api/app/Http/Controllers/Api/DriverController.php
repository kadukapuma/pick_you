<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Events\DashboardUpdated;
use App\Events\DriverCreated;
use App\Models\Driver;
use App\Services\Locations\DriverLocationService;
use App\Services\Media\ImageStorageService;
use App\Models\AdminNotificationLog;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use App\Mail\DriverApprovedMail;
use App\Mail\DriverSuspendedMail;

class DriverController extends Controller
{
    use ApiResponse;

    public const STATUSES = ['pending', 'approved', 'suspended', 'updated', 'rejected'];

    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);
        $search = trim((string) $request->input('search', $request->input('q', '')));
        $status = trim((string) $request->input('status', ''));

        $data = Driver::with(['user', 'vehicles.images'])
            ->withCount('rides')
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($q) use ($search) {
                    $q->where('license_number', 'like', "%{$search}%")
                        ->orWhereHas('user', function ($uq) use ($search) {
                            $uq->where('first_name', 'like', "%{$search}%")
                                ->orWhere('last_name', 'like', "%{$search}%")
                                ->orWhere('email', 'like', "%{$search}%")
                                ->orWhere('phone', 'like', "%{$search}%");
                        });
                });
            })
            ->when($status !== '' && $status !== 'all', function ($query) use ($status) {
                $query->where('status', $status);
            })
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->success($data, 'Driver list retrieved successfully.');
    }

    public function statusCounts()
    {
        $counts = Driver::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $result = ['all' => (int) $counts->sum()];
        foreach (self::STATUSES as $status) {
            $result[$status] = (int) ($counts[$status] ?? 0);
        }

        return $this->success($result, 'Driver status counts retrieved successfully.');
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

        // Driver status is role-scoped; users.is_active is reserved for global bans.
        if ($request->status === 'approved' && $driver->user) {
            $driver->user->ensureRole('driver', true);

            // Send approval email
            if ($driver->user->email) {
                Mail::to($driver->user->email)->send(new DriverApprovedMail($driver));
            }
        } elseif ($request->status === 'suspended' && $driver->user) {
            $driver->user->ensureRole('driver', false);

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

        $driver->user?->ensureRole('driver', (bool) $request->is_active);

        event(new DashboardUpdated('driver.account', [
            'driver_id' => $driver->id,
            'is_active' => (bool) $request->is_active,
        ]));

        return $this->success($driver, 'Driver account status updated successfully.');
    }

    public function updateOwnAvailability(Request $request, DriverLocationService $locations)
    {
        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $user = $request->user();
        if (!$user || !$user->driver) {
            return $this->error('Driver not found.', 404);
        }

        $driver = $user->driver;

        // Update the driver's availability status (1 for online, 0 for offline)
        $availability = $request->is_active ? 1 : 0;
        $driver->update(['availability' => $availability]);

        if ($availability === 0) {
            $locations->removeOfflineDriver($driver);
        }

        event(new DashboardUpdated('driver.account', [
            'driver_id' => $driver->id,
            'availability' => $availability,
        ]));

        return $this->success($driver->load('user'), 'Availability updated successfully.');
    }

    public function completeProfile(Request $request, ImageStorageService $images)
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
            'ownership_letter' => 'nullable|file',
            'license_front' => 'nullable|file',
            'license_back' => 'nullable|file',
        ]);

        $user = $request->user();
        if (!$user->driver) {
            $driver = $user->driver()->create([]);
        } else {
            $driver = $user->driver;
        }

        $updateData = [
            'status' => 'pending',
            'dob' => $request->filled('dob') ? $request->dob : $driver->dob,
            'address' => $request->filled('address') ? $request->address : $driver->address,
            'license_number' => $request->filled('nic') ? trim((string) $request->nic) : $driver->license_number,
            'license_front_path' => $driver->license_front_path,
            'license_back_path' => $driver->license_back_path,
        ];
        $replacedDriverImages = [];

        if ($request->hasFile('license_front')) {
            $replacedDriverImages[] = $driver->license_front_path;
            $updateData['license_front_path'] = $images->store(
                $request->file('license_front'),
                "drivers/{$driver->id}/licenses",
                'license-front',
            );
        }

        if ($request->hasFile('license_back')) {
            $replacedDriverImages[] = $driver->license_back_path;
            $updateData['license_back_path'] = $images->store(
                $request->file('license_back'),
                "drivers/{$driver->id}/licenses",
                'license-back',
            );
        }

        $driver->update($updateData);
        foreach ($replacedDriverImages as $previousPath) {
            $images->deleteLocal($previousPath);
        }

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
            $existingImages = $vehicle->images()->first();
            $imageData = array_filter([
                'v_front' => $request->hasFile('front')
                    ? $images->store(
                        $request->file('front'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'v-front',
                    )
                    : null,
                'v_back' => $request->hasFile('back')
                    ? $images->store(
                        $request->file('back'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'v-back',
                    )
                    : null,
                'v_side' => $request->hasFile('interior')
                    ? $images->store(
                        $request->file('interior'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'v-side',
                    )
                    : null,
                'insurance_img' => $request->hasFile('insurance')
                    ? $images->store(
                        $request->file('insurance'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'insurance',
                    )
                    : null,
                'licence_img' => $request->hasFile('registration')
                    ? $images->store(
                        $request->file('registration'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'registration',
                    )
                    : null,
                'ownership_letter_path' => $request->hasFile('ownership_letter')
                    ? $images->store(
                        $request->file('ownership_letter'),
                        "drivers/{$driver->id}/vehicles/{$vehicle->id}",
                        'ownership-letter',
                    )
                    : null,
            ]);

            if (!empty($imageData)) {
                $vehicle->images()->updateOrCreate(
                    ['vehicle_id' => $vehicle->id],
                    array_merge(['driver_id' => $driver->id], $imageData)
                );
                foreach (array_keys($imageData) as $field) {
                    $images->deleteLocal($existingImages?->{$field});
                }
            }
        }

        return $this->success($driver->load('vehicles.images'), 'Profile completed successfully.');
    }

    public function updateLicenseImages(Request $request, ImageStorageService $images)
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

        $updatedData = [];
        $replacedPaths = [];

        if ($request->hasFile('license_front')) {
            $replacedPaths[] = $driver->license_front_path;
            $updatedData['license_front_path'] = $images->store(
                $request->file('license_front'),
                "drivers/{$driver->id}/licenses",
                'license-front',
            );
        }

        if ($request->hasFile('license_back')) {
            $replacedPaths[] = $driver->license_back_path;
            $updatedData['license_back_path'] = $images->store(
                $request->file('license_back'),
                "drivers/{$driver->id}/licenses",
                'license-back',
            );
        }

        if (!empty($updatedData)) {
            $driver->update($updatedData);
            foreach ($replacedPaths as $previousPath) {
                $images->deleteLocal($previousPath);
            }
        }

        return $this->success($driver, 'License images updated successfully');
    }
}
