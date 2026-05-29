<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PassengerProfileController extends Controller
{
  use ApiResponse;

  public function getProfile(Request $request)
  {
    $user = $request->user()->load('passenger');

    if ($user->role !== 'passenger' || !$user->passenger) {
      return $this->error('Passenger profile not found', 404);
    }

    return $this->success(
      $this->buildProfileData($user),
      'Passenger profile retrieved successfully'
    );
  }

  public function updateProfile(Request $request)
  {
    $user = $request->user()->load('passenger');

    if ($user->role !== 'passenger' || !$user->passenger) {
      return $this->error('Passenger profile not found', 404);
    }

    $validator = Validator::make($request->all(), [
      'first_name' => 'required|string|max:255',
      'last_name' => 'required|string|max:255',
      'email' => 'nullable|email|max:255|unique:users,email,' . $user->id,
    ]);

    if ($validator->fails()) {
      return $this->error('Validation Error', 422, $validator->errors());
    }

    $user->update([
      'first_name' => $request->first_name,
      'last_name' => $request->last_name,
      'email' => $request->email,
    ]);

    $user->refresh()->load('passenger');

    return $this->success(
      $this->buildProfileData($user),
      'Passenger profile updated successfully'
    );
  }

  public function updateProfilePicture(Request $request)
  {
    $request->validate([
      'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
    ]);

    $user = $request->user()->load('passenger');

    if ($user->role !== 'passenger' || !$user->passenger) {
      return $this->error('Passenger profile not found', 404);
    }

    $file = $request->file('profile_picture');

    if ($user->profile_picture_path && !filter_var($user->profile_picture_path, FILTER_VALIDATE_URL)) {
      $oldLocal = public_path($user->profile_picture_path);
      if (file_exists($oldLocal)) {
        @unlink($oldLocal);
      }
    }

    $uploadedUrl = $this->uploadImageToCloudinary(
      $file,
      'users/' . $user->id,
      'passenger_profile_' . time()
    );

    if (!$uploadedUrl) {
      return $this->error('Failed to upload profile picture', 500);
    }

    $user->update(['profile_picture_path' => $uploadedUrl]);
    $user->refresh()->load('passenger');

    return $this->success(
      $this->buildProfileData($user),
      'Passenger profile picture updated successfully'
    );
  }

  private function buildProfileData($user): array
  {
    return [
      'id' => $user->id,
      'first_name' => $user->first_name,
      'last_name' => $user->last_name,
      'email' => $user->email,
      'phone' => $user->phone,
      'profile_picture' => $this->resolveImageUrl($user->profile_picture_path),
      'wallet_balance' => optional($user->passenger)->wallet_balance,
    ];
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

  private function uploadImageToCloudinary($file, string $folder, string $publicId): ?string
  {
    $extension = $file->getClientOriginalExtension() ?: 'jpg';
    $fileName = $publicId . '.' . $extension;
    $relativeFolder = 'uploads/' . trim($folder, '/');
    $destinationPath = public_path($relativeFolder);

    if (!file_exists($destinationPath)) {
      mkdir($destinationPath, 0755, true);
    }

    $file->move($destinationPath, $fileName);

    return $relativeFolder . '/' . $fileName;
  }
}
