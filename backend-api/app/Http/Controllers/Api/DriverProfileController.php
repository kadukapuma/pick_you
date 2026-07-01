<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Media\ImageStorageService;
use App\Services\Rides\RideStateMachine;
use Illuminate\Http\Request;
use App\Traits\ApiResponse;

class DriverProfileController extends Controller
{
    use ApiResponse;

    public function getProfile(Request $request, ImageStorageService $images)
    {
        $user = $request->user()->load(['driver.vehicles.vehicleType', 'driver.vehicles.images']);

        if (! $user->canActAs('driver') || !$user->driver) {
            return $this->error('Driver profile not found', 404);
        }

        $driver = $user->driver;

        $tripsCount = $driver->rides()->where('status', RideStateMachine::COMPLETED)->count();
        $rating = $driver->rating ?? 0.0;

        $profilePictureUrl = $images->url($user->profile_picture_path);

        $vehicle = $driver->vehicles->first();

        $vehicleImages = [
            'front' => null,
            'side' => null,
            'back' => null,
        ];
        if ($vehicle && $vehicle->images) {
            if ($vehicle->images->v_front) $vehicleImages['front'] = $images->url($vehicle->images->v_front);
            if ($vehicle->images->v_side) $vehicleImages['side'] = $images->url($vehicle->images->v_side);
            if ($vehicle->images->v_back) $vehicleImages['back'] = $images->url($vehicle->images->v_back);
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
            'email' => $user->driver->credential?->login_email ?? $user->email,
            'phone' => $user->phone,
            'profile_picture' => $profilePictureUrl,
            'trips' => $tripsCount,
            'rating' => $rating,
            'acceptance' => '94%', // Replace with actual calculation logic when available
            'cancellation' => '2%', // Replace with actual calculation logic when available
            'vehicle' => $vehicleData,
        ], 'Driver profile retrieved successfully');
    }
}
