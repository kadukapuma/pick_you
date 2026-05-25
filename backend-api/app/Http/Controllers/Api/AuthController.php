<?php

namespace App\Http\Controllers\Api;

use App\Events\DriverCreated;
use App\Events\PassengerCreated;
use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Models\SuperAdminNotificationLog;
use App\Models\User;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\File;

class AuthController extends Controller
{
    use ApiResponse;

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'phone' => 'required|string|max:20|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:passenger,driver,admin',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'is_active' => true,
        ])->load('rolePermissions');


        $displayName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
        if ($displayName === '') {
            $displayName = "User #{$user->id}";
        }

        // Depending on role, create passenger or driver profile
        if ($request->role === 'passenger') {
            $passenger = $user->passenger()->create([
                'wallet_balance' => 0.00
            ]);

            $passenger = $passenger->loadMissing('user');
            event(new PassengerCreated($passenger));

            AdminNotificationLog::createAndBroadcast(
                'passenger',
                'New passenger registered',
                "{$displayName} joined as passenger.",
                ['passenger_id' => $passenger->id, 'user_id' => $user->id]
            );

            // Notify super admin
            SuperAdminNotificationLog::createAndBroadcast(
                'passenger',
                'New passenger registered',
                "{$displayName} joined as passenger.",
                ['passenger_id' => $passenger->id, 'user_id' => $user->id]
            );
        } elseif ($request->role === 'driver') {
            $driver = $user->driver()->create([
                'status' => 'pending',
                'availability' => 0,
                'rating' => 0.0
            ]);

            $driver = $driver->loadMissing(['user', 'vehicles.images'])->loadCount('rides');
            event(new DriverCreated($driver));
            AdminNotificationLog::createAndBroadcast(
                'driver',
                'New driver registered',
                "{$displayName} joined as driver.",
                ['driver_id' => $driver->id, 'user_id' => $user->id]
            );

            // Notify super admin
            SuperAdminNotificationLog::createAndBroadcast(
                'driver',
                'New driver registered',
                "{$displayName} joined as driver.",
                ['driver_id' => $driver->id, 'user_id' => $user->id]
            );
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'User registered successfully', 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return $this->error('Invalid credentials', 401);
        }

        if (!$user->is_active) {
            return $this->error('Account is suspended. Please contact Super Admin.', 403);
        }

        // Check if user is super_admin
        if ($user->role === User::ROLE_SUPER_ADMIN) {
            return $this->success([
                'require_2fa' => true,
                'email' => $user->email
            ], 'Super Admin authentication required');
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load(['driver.vehicles', 'rolePermissions']);

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'User logged in successfully');
    }

    public function verifySuperAdmin2FA(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'code' => 'required|string',
        ]);

        // Hardcoded 2FA code for Super Admin
        $hardcodedCode = "8899"; // Example hardcoded code

        if ($request->code !== $hardcodedCode) {
            return $this->error('Invalid authentication code', 401);
        }

        $user = User::where('email', $request->email)->where('role', User::ROLE_SUPER_ADMIN)->first();

        if (!$user) {
            return $this->error('User not found', 404);
        }

        if (!$user->is_active) {
            return $this->error('Account is suspended. Please contact System Administrator.', 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;
        $user->load(['driver', 'rolePermissions']);

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Super Admin logged in successfully');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully');
    }

    public function sendOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return $this->error('User not found', 404);
        }

        // Generate a 4 digit OTP
        $otpCode = rand(1000, 9999);

        // Store OTP
        $user->otpVerifications()->create([
            'otp_code' => $otpCode,
            'purpose' => $request->purpose,
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5)
        ]);

        // Integrate Email Gateway here (e.g., Mail, SendGrid, etc.)
        // For now, we will just return it in the response for testing
        return $this->success(['otp' => $otpCode], 'OTP sent successfully');
    }

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|string|email',
            'otp_code' => 'required|string',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user = User::where('email', $request->email)->first();
        if (!$user) {
            return $this->error('User not found', 404);
        }

        $otp = $user->otpVerifications()
            ->where('otp_code', $request->otp_code)
            ->where('purpose', $request->purpose)
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otp) {
            return $this->error('Invalid or expired OTP', 400);
        }

        $otp->update(['is_verified' => true]);

        return $this->success(null, 'OTP verified successfully');
    }

    public function updateProfilePicture(Request $request)
    {
        $request->validate([
            'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();
        $userId = $user->id;
        $basePath = "uploads/users/{$userId}";
        $fullPath = public_path($basePath);

        if (!File::exists($fullPath)) {
            File::makeDirectory($fullPath, 0755, true);
        }

        $file = $request->file('profile_picture');
        $fileName = 'profile_' . time() . '.' . $file->getClientOriginalExtension();

        // Delete old picture if exists
        if ($user->profile_picture_path && File::exists(public_path($user->profile_picture_path))) {
            File::delete(public_path($user->profile_picture_path));
        }

        $file->move($fullPath, $fileName);
        $user->update(['profile_picture_path' => "{$basePath}/{$fileName}"]);

        return $this->success($user, 'Profile picture updated successfully');
    }

    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return $this->error('Current password does not match', 401);
        }

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return $this->success(null, 'Password updated successfully');
    }
}
