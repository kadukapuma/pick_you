<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\OtpVerification;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class PassengerAuthController extends Controller
{
    use ApiResponse;

    private function normalizePhoneNumber($phone)
    {
        $normalized = preg_replace('/\D+/', '', $phone);
        if (str_starts_with($normalized, '0') && strlen($normalized) === 10) {
            $normalized = '94' . substr($normalized, 1);
        }
        return $normalized;
    }

    public function sendOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $notifyPhone = $this->normalizePhoneNumber($request->phone);

        if (strlen($notifyPhone) !== 11) {
            return $this->error('Invalid phone number format. Must be a valid Sri Lankan mobile number.', 422, [
                'phone' => $request->phone,
                'normalized_phone' => $notifyPhone,
            ]);
        }

        $otpCode = rand(1000, 9999);

        OtpVerification::create([
            'contact' => $notifyPhone,
            'purpose' => 'passenger_login',
            'otp_code' => $otpCode,
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5)
        ]);

        $response = Http::get('https://app.notify.lk/api/v1/send', [
            'user_id' => env('NOTIFYLK_USER_ID'),
            'api_key' => env('NOTIFYLK_API_KEY'),
            'sender_id' => env('NOTIFYLK_SENDER_ID'),
            'to' => $notifyPhone,
            'message' => "Your OTP: $otpCode Please use the above PickYou OTP to complete your login. Do not share this OTP with anyone."
        ]);

        if (!$response->successful()) {
            return $this->error('Failed to send OTP SMS', 502, [
                'provider_response' => $response->body()
            ]);
        }

        return $this->success(['otp' => $otpCode], 'OTP sent successfully');
    }

    public function verifyOtp(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
            'otp_code' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $notifyPhone = $this->normalizePhoneNumber($request->phone);

        $otp = OtpVerification::where('contact', $notifyPhone)
            ->where('otp_code', $request->otp_code)
            ->where('purpose', 'passenger_login')
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->first();

        if (!$otp) {
            return $this->error('Invalid or expired OTP', 400);
        }

        $otp->update(['is_verified' => true]);

        $user = User::where('phone', $notifyPhone)
            ->orWhere('phone', $request->phone)
            ->orWhere('phone', '0' . substr($notifyPhone, 2))
            ->first();

        if ($user) {
            if (!$user->is_verified) {
                $user->update(['is_verified' => true]);
            }
            $token = $user->createToken('passenger_app_token')->plainTextToken;
            $user->load(['passenger', 'rolePermissions']);

            return $this->success([
                'registered' => true,
                'user' => $user,
                'token' => $token,
            ], 'Login successful');
        }

        return $this->success([
            'registered' => false,
            'phone' => $request->phone,
            'normalized_phone' => $notifyPhone
        ], 'OTP verified. Please complete registration.');
    }

    public function completeRegistration(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255|unique:users',
            'phone' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $notifyPhone = $this->normalizePhoneNumber($request->phone);

        $verifiedOtp = OtpVerification::where('contact', $notifyPhone)
            ->where('purpose', 'passenger_login')
            ->where('is_verified', true)
            ->where('expires_at', '>', now()->subMinutes(15))
            ->latest()
            ->first();

        if (!$verifiedOtp) {
            return $this->error('Please verify OTP before registering', 403);
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => null,
            'role' => 'passenger',
            'is_active' => true,
            'is_verified' => true
        ]);

        $user->passenger()->create([
            'wallet_balance' => 0.00
        ]);

        $token = $user->createToken('passenger_app_token')->plainTextToken;
        $user->load(['passenger', 'rolePermissions']);

        return $this->success([
            'user' => $user,
            'token' => $token,
        ], 'Registration completed successfully');
    }

    public function logout(Request $request)
    {
        if ($request->user()) {
            $request->user()->currentAccessToken()->delete();
        }
        return $this->success(null, 'Logged out successfully');
    }
}
