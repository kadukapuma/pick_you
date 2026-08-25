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

  /**
   * Add a promotion code after registration, for a user who skipped it at
   * signup. Write-once: refuses once a code is already on file, matching the
   * immutability enforced at registration time.
   */
  public function updatePromoCode(Request $request)
  {
    $user = $request->user();

    if ($user->promo_code) {
      return $this->error('A promotion code is already set on this account.', 422);
    }

    $validator = Validator::make($request->all(), [
      'promo_code' => 'required|string|max:20',
    ]);

    if ($validator->fails()) {
      return $this->error('Validation Error', 422, $validator->errors());
    }

    $normalized = preg_replace('/\D+/', '', $request->promo_code);
    if (strlen($normalized) === 10 && str_starts_with($normalized, '0')) {
      $normalized = '94' . substr($normalized, 1);
    }

    if ($normalized === $user->phone_normalized) {
      return $this->error('You cannot use your own phone number as a promotion code.', 422, [
        'promo_code' => ['You cannot use your own phone number as a promotion code.'],
      ]);
    }

    $referredBy = \App\Models\User::where('phone_normalized', $normalized)->first();
    if (! $referredBy) {
      return $this->error('This promotion code does not match a PickU account.', 422, [
        'promo_code' => ['This promotion code does not match a PickU account.'],
      ]);
    }

    $user->update(['promo_code' => $normalized, 'referred_by_user_id' => $referredBy->id]);

    return $this->success(['promo_code' => $normalized], 'Promotion code added successfully');
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
      'loyalty_points_balance' => optional($user->passenger)->loyalty_points_balance,
      'loyalty_points_reserved_balance' => optional($user->passenger)->loyalty_points_reserved_balance,
      'student_status' => optional($user->passenger?->studentVerification)->status,
    ];
  }

}
