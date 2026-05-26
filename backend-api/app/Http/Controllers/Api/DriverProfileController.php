<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class DriverProfileController extends Controller
{
    use ApiResponse;

    public function getProfile(Request $request)
    {
        $user = $request->user()->load(['driver.vehicles.vehicleType', 'driver.vehicles.images']);

        if ($user->role !== 'driver' || !$user->driver) {
            return $this->error('Driver profile not found', 404);
        }

        $driver = $user->driver;

        $tripsCount = $driver->rides()->where('status', 'completed')->count();
        $rating = $driver->rating ?? 0.0;

        $profilePictureUrl = $this->resolveImageUrl($user->profile_picture_path);

        $vehicle = $driver->vehicles->first();

        $vehicleImages = [
            'front' => null,
            'side' => null,
            'back' => null,
        ];
        if ($vehicle && $vehicle->images) {
            if ($vehicle->images->v_front) $vehicleImages['front'] = $this->resolveImageUrl($vehicle->images->v_front);
            if ($vehicle->images->v_side) $vehicleImages['side'] = $this->resolveImageUrl($vehicle->images->v_side);
            if ($vehicle->images->v_back) $vehicleImages['back'] = $this->resolveImageUrl($vehicle->images->v_back);
        }

        $vehicleData = [
            'plateNumber' => $vehicle ? $vehicle->vehicle_number : 'Not set',
            'brand' => $vehicle ? $vehicle->brand : '',
            'model' => $vehicle ? $vehicle->model : '',
            'color' => $vehicle ? $vehicle->color : '',
            'year' => $vehicle ? $vehicle->year : '',
            'vehicle_type' => $vehicle ? $vehicle->vehicle_type : '',
            'images' => $vehicleImages,
            'image' => $vehicleImages['front'], // maintain backward compatibility
        ];

        return $this->success([
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'email' => $user->email,
            'phone' => $user->phone,
            'profile_picture' => $profilePictureUrl,
            'trips' => $tripsCount,
            'rating' => $rating,
            'acceptance' => '94%', // Replace with actual calculation logic when available
            'cancellation' => '2%', // Replace with actual calculation logic when available
            'vehicle' => $vehicleData,
        ], 'Driver profile retrieved successfully');
    }

    private function resolveImageUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        if (filter_var($path, FILTER_VALIDATE_URL)) {
            return $path;
        }

        return url($path);
    }
}
