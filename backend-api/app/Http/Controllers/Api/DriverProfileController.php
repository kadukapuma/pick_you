<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Media\ImageStorageService;
use App\Services\Rides\RideStateMachine;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Validator;
use App\Traits\ApiResponse;

class DriverProfileController extends Controller
{
    use ApiResponse;

    public function getProfile(Request $request, ImageStorageService $images)
    {
        $user = $request->user()->load(['driver.credential', 'driver.vehicles.vehicleType', 'driver.vehicles.images']);

        if (! $user->canActAs('driver') || !$user->driver) {
            return $this->error('Driver profile not found', 404);
        }

        return $this->success(
            $this->buildProfileData($user, $images),
            'Driver profile retrieved successfully'
        );
    }

    public function updateProfile(Request $request, ImageStorageService $images)
    {
        $user = $request->user()->load(['driver.credential', 'driver.vehicles.vehicleType', 'driver.vehicles.images']);

        if (! $user->canActAs('driver') || !$user->driver) {
            return $this->error('Driver profile not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => [
                'nullable',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user->id),
                Rule::unique('driver_credentials', 'login_email')->ignore($user->driver->credential?->id),
            ],
            'phone' => 'nullable|string|max:30',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $email = $request->filled('email')
            ? mb_strtolower(trim((string) $request->email))
            : $user->email;

        $user->update([
            'first_name' => trim((string) $request->first_name),
            'last_name' => trim((string) $request->last_name),
            'email' => $email,
            'phone' => $request->phone,
        ]);

        if ($user->driver->credential) {
            $user->driver->credential->update(['login_email' => $email]);
        }

        $user->refresh()->load(['driver.credential', 'driver.vehicles.vehicleType', 'driver.vehicles.images']);

        return $this->success(
            $this->buildProfileData($user, $images),
            'Driver profile updated successfully'
        );
    }

    public function updateBank(Request $request, ImageStorageService $images)
    {
        $user = $request->user()->load(['driver.credential', 'driver.vehicles.vehicleType', 'driver.vehicles.images']);

        if (! $user->canActAs('driver') || !$user->driver) {
            return $this->error('Driver profile not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'bank_name' => 'required|string|max:255',
            'branch' => 'nullable|string|max:255',
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:64',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user->driver->update([
            'bank_name' => trim((string) $request->bank_name),
            'bank_branch' => trim((string) $request->branch),
            'account_name' => trim((string) $request->account_name),
            'account_number' => trim((string) $request->account_number),
        ]);

        $user->refresh()->load(['driver.credential', 'driver.vehicles.vehicleType', 'driver.vehicles.images']);

        return $this->success(
            $this->buildProfileData($user, $images),
            'Bank details updated successfully'
        );
    }

    private function buildProfileData($user, ImageStorageService $images): array
    {
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
            'id' => $vehicle ? $vehicle->id : null,
            'plateNumber' => $vehicle ? $vehicle->vehicle_number : 'Not set',
            'brand' => $vehicle ? $vehicle->brand : '',
            'model' => $vehicle ? $vehicle->model : '',
            'color' => $vehicle ? $vehicle->color : '',
            'year' => $vehicle ? $vehicle->year : '',
            'vehicle_type' => $vehicle ? $vehicle->vehicle_type : '',
            'images' => $vehicleImages,
            'image' => $vehicleImages['front'], // maintain backward compatibility
        ];

        return [
            'id' => $user->id,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'email' => $user->driver->credential?->login_email ?? $user->email,
            'phone' => $user->phone,
            'profile_picture' => $profilePictureUrl,
            'trips' => $tripsCount,
            'rating' => $rating,
            'acceptance' => '94%', // Replace with actual calculation logic when available
            'cancellation' => '2%', // Replace with actual calculation logic when available
            'vehicle' => $vehicleData,
            'bank' => [
                'name' => $driver->bank_name,
                'branch' => $driver->bank_branch,
                'accountName' => $driver->account_name,
                'accountNumber' => $driver->account_number,
            ],
            'documents' => $this->buildDocumentData($driver, $vehicle?->images, $images),
        ];
    }

    private function buildDocumentData($driver, $vehicleImages, ImageStorageService $images): array
    {
        $statusForPath = function (?string $path) use ($driver): string {
            if (blank($path)) {
                return 'not_set';
            }

            return match ($driver->status) {
                'approved' => 'verified',
                'rejected' => 'rejected',
                default => 'pending',
            };
        };

        $document = function (?string $path, $source = null) use ($images, $statusForPath): array {
            return [
                'status' => $statusForPath($path),
                'image' => $images->url($path),
                'uploaded_at' => $source?->created_at,
                'updated_at' => $source?->updated_at,
            ];
        };

        return [
            'licenseFront' => $document($driver->license_front_path, $driver),
            'licenseBack' => $document($driver->license_back_path, $driver),
            'vehicleRegistration' => $document($vehicleImages?->licence_img, $vehicleImages),
            'insuranceCertificate' => $document($vehicleImages?->insurance_img, $vehicleImages),
            'vehicleFront' => $document($vehicleImages?->v_front, $vehicleImages),
            'vehicleBack' => $document($vehicleImages?->v_back, $vehicleImages),
            'vehicleSide' => $document($vehicleImages?->v_side, $vehicleImages),
        ];
    }
}
