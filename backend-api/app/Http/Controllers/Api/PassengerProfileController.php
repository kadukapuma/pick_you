<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Media\ImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PassengerProfileController extends Controller
{
  use ApiResponse;

  public function getProfile(Request $request, ImageStorageService $images)
  {
    $user = $request->user()->load('passenger');

    if (! $user->canActAs('passenger') || !$user->passenger) {
      return $this->error('Passenger profile not found', 404);
    }

    return $this->success(
      $this->buildProfileData($user, $images),
      'Passenger profile retrieved successfully'
    );
  }

  public function updateProfile(Request $request, ImageStorageService $images)
  {
    $user = $request->user()->load('passenger');

    if (! $user->canActAs('passenger') || !$user->passenger) {
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
      $this->buildProfileData($user, $images),
      'Passenger profile updated successfully'
    );
  }

  public function updateProfilePicture(Request $request, ImageStorageService $images)
  {
    $request->validate([
      'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
    ]);

    $user = $request->user()->load('passenger');

    if (! $user->canActAs('passenger') || !$user->passenger) {
      return $this->error('Passenger profile not found', 404);
    }

    $file = $request->file('profile_picture');
    $previousPath = $user->profile_picture_path;

    $storedPath = $images->store(
      $file,
      'users/' . $user->id . '/profiles',
      'passenger-profile',
    );

    $user->update(['profile_picture_path' => $storedPath]);
    $images->deleteLocal($previousPath);
    $user->refresh()->load('passenger');

    return $this->success(
      $this->buildProfileData($user, $images),
      'Passenger profile picture updated successfully'
    );
  }

  private function buildProfileData($user, ImageStorageService $images): array
  {
    return [
      'id' => $user->id,
      'first_name' => $user->first_name,
      'last_name' => $user->last_name,
      'email' => $user->email,
      'phone' => $user->phone,
      'profile_picture' => $images->url($user->profile_picture_path),
      'wallet_balance' => optional($user->passenger)->wallet_balance,
    ];
  }

}
