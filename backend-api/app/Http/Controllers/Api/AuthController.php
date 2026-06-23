<?php

namespace App\Http\Controllers\Api;

use App\Events\DriverCreated;
use App\Events\PassengerCreated;
use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Models\SuperAdminNotificationLog;
use App\Models\User;
use App\Models\DriverCredential;
use App\Services\Auth\AuthPayload;
use App\Services\Auth\NotifySmsSender;
use App\Services\Media\ImageStorageService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\File;

class AuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AuthPayload $authPayload,
        private readonly NotifySmsSender $sms,
    ) {}

    private function resolveOtpUser(Request $request): ?User
    {
        if ($request->filled('email')) {
            $credential = DriverCredential::with('driver.user')
                ->where('login_email', mb_strtolower(trim($request->email)))
                ->first();

            return $credential?->driver?->user ?? User::where('email', $request->email)->first();
        }

        if ($request->filled('phone')) {
            $normalizedPhone = preg_replace('/\D+/', '', $request->phone);
            $phoneCandidates = array_values(array_unique(array_filter([
                $request->phone,
                $normalizedPhone,
                str_starts_with($normalizedPhone, '0') && strlen($normalizedPhone) === 10
                    ? '94' . substr($normalizedPhone, 1)
                    : null,
                str_starts_with($normalizedPhone, '94') && strlen($normalizedPhone) === 11
                    ? '0' . substr($normalizedPhone, 2)
                    : null,
            ])));

            return User::whereIn('phone', $phoneCandidates)->first();
        }

        return null;
    }

    public function register(Request $request)
    {
        if ($request->input('role') === User::ROLE_DRIVER) {
            return app(DriverAuthController::class)->register($request);
        }

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
            'is_verified' => false,
        ])->load('rolePermissions');
        $user->ensureRole($request->role);


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

        $token = $user->createToken('auth_token', ['role:'.$request->role])->plainTextToken;

        return $this->success(
            $this->authPayload->for($user, $request->role, $token),
            'User registered successfully',
            201,
        );
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

        $driverCredential = DriverCredential::where('login_email', mb_strtolower(trim($request->email)))->first();
        if ($request->input('role') === User::ROLE_DRIVER
            || ($driverCredential && Hash::check($request->password, $driverCredential->password))) {
            return app(DriverAuthController::class)->login($request);
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

        $user->ensureRole($user->role);
        $token = $user->createToken('auth_token', ['role:'.$user->role])->plainTextToken;
        $user->load(['driver.vehicles', 'rolePermissions']);

        return $this->success($this->authPayload->for($user, $user->role, $token), 'User logged in successfully');
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

        $user->ensureRole(User::ROLE_SUPER_ADMIN);
        $token = $user->createToken('auth_token', ['role:super_admin'])->plainTextToken;
        $user->load(['driver', 'rolePermissions']);

        return $this->success($this->authPayload->for($user, User::ROLE_SUPER_ADMIN, $token), 'Super Admin logged in successfully');
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return $this->success(null, 'Logged out successfully');
    }

    public function sendOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|string|email',
            'phone' => 'nullable|string',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        if (!$request->filled('email') && !$request->filled('phone')) {
            return $this->error('Email or phone number is required', 422);
        }

        $user = $this->resolveOtpUser($request);
        if (!$user) {
            return $this->error('User not found', 404);
        }

        if (empty($user->phone)) {
            return $this->error('Phone number not found for user', 422);
        }

        $notifyPhone = preg_replace('/\D+/', '', $user->phone);
        if (str_starts_with($notifyPhone, '0') && strlen($notifyPhone) === 10) {
            $notifyPhone = '94' . substr($notifyPhone, 1);
        }

        if (strlen($notifyPhone) !== 11) {
            return $this->error('Phone number must be 11 digits for Notify.lk', 422, [
                'phone' => $user->phone,
                'normalized_phone' => $notifyPhone,
            ]);
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

        // Send SMS using Notify.lk
        if (! $this->sms->send(
            $notifyPhone,
            "Your OTP: $otpCode Please use the above PickYou OTP to complete your action. Do not share this OTP with anyone.",
        )) {
            return $this->error('Failed to send OTP SMS', 502);
        }
        // Integrate Email Gateway here (e.g., Mail, SendGrid, etc.)
        // For now, we will just return it in the response for testing
        return $this->success(['otp' => $otpCode], 'OTP sent successfully');
    }

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|string|email',
            'phone' => 'nullable|string',
            'otp_code' => 'required|string',
            'purpose' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        if (!$request->filled('email') && !$request->filled('phone')) {
            return $this->error('Email or phone number is required', 422);
        }

        $user = $this->resolveOtpUser($request);
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

        if ($request->purpose === 'verification') {
            $user->update(['is_verified' => true]);
        }

        return $this->success(null, 'OTP verified successfully');
    }

    public function resetPassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'nullable|string|email',
            'phone' => 'nullable|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        if (!$request->filled('email') && !$request->filled('phone')) {
            return $this->error('Email or phone number is required', 422);
        }

        $user = $this->resolveOtpUser($request);

        if (!$user) {
            return $this->error('User not found', 404);
        }

        $verifiedOtp = $user->otpVerifications()
            ->where('purpose', 'forgot_password')
            ->where('is_verified', true)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$verifiedOtp) {
            return $this->error('OTP verification required', 403);
        }

        $credential = $request->filled('email')
            ? DriverCredential::where('login_email', mb_strtolower(trim($request->email)))->first()
            : $user->driver?->credential;

        if ($credential) {
            $credential->update(['password' => $request->password]);
        } else {
            $user->update(['password' => Hash::make($request->password)]);
        }

        $user->otpVerifications()
            ->where('purpose', 'forgot_password')
            ->update(['is_verified' => false]);

        return $this->success(null, 'Password reset successfully');
    }

    public function updateProfilePicture(Request $request, ImageStorageService $images)
    {
        $request->validate([
            'profile_picture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $user = $request->user();
        $file = $request->file('profile_picture');
        $previousPath = $user->profile_picture_path;

        $storedPath = $images->store(
            $file,
            "users/{$user->id}/profiles",
            'profile',
        );
        $user->update(['profile_picture_path' => $storedPath]);
        $images->deleteLocal($previousPath);

        $responseUser = $user->fresh();
        $responseUser->setAttribute('profile_picture_path', $images->url($storedPath));

        return $this->success($responseUser, 'Profile picture updated successfully');
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
