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
            'status' => 'required|in:pending,approved,suspended,updated'
        ]);

        $driver = Driver::with(['user', 'vehicles.images'])->withCount('rides')->find($id);
        if (!$driver) return $this->error('Driver not found.', 404);

        $driver->update(['status' => $request->status]);

        // Also activate the driver's user account if approved
        if ($request->status === 'approved' && $driver->user) {
            $driver->user->update(['is_active' => true]);
        } elseif ($request->status === 'suspended' && $driver->user) {
            $driver->user->update(['is_active' => false]);
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
