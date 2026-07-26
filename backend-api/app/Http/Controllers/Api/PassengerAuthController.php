<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\OtpVerification;
use App\Traits\ApiResponse;
use App\Services\Auth\AuthPayload;
use App\Services\Auth\PhoneNumberNormalizer;
use App\Services\Auth\NotifySmsSender;
use App\Services\Auth\OtpCodeService;
use App\Services\Auth\PhoneIdentityConflict;
use App\Services\Auth\PhoneIdentityResolver;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PassengerAuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PhoneNumberNormalizer $phones,
        private readonly PhoneIdentityResolver $phoneIdentities,
        private readonly AuthPayload $authPayload,
        private readonly NotifySmsSender $sms,
        private readonly OtpCodeService $otpCodes,
    ) {}

    private function normalizePhoneNumber($phone)
    {
        try {
            return $this->phones->normalize($phone);
        } catch (InvalidArgumentException) {
            return preg_replace('/\D+/', '', $phone);
        }
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

        $otpCode = $this->otpCodes->generate();

        OtpVerification::create([
            'contact' => $notifyPhone,
            'purpose' => 'passenger_login',
            'otp_code' => $this->otpCodes->storeValue($otpCode),
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5)
        ]);

        if (! $this->sms->send(
            $notifyPhone,
            "Your OTP: $otpCode Please use the above PickYou OTP to complete your login. Do not share this OTP with anyone.",
        )) {
            return $this->error('Failed to send OTP SMS', 502);
        }

        return $this->success($this->otpCodes->debugPayload($otpCode), 'OTP sent successfully');
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
            ->where('purpose', 'passenger_login')
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->get()
            ->first(fn (OtpVerification $otp) => $this->otpCodes->matches((string) $request->otp_code, $otp->otp_code));

        if (!$otp) {
            return $this->error('Invalid or expired OTP', 400);
        }

        $otp->update(['is_verified' => true]);

        try {
            $user = $this->phoneIdentities->resolve($request->phone);
        } catch (PhoneIdentityConflict $exception) {
            return $this->error($exception->getMessage(), 409);
        }

        if ($user) {
            if (! $user->is_active) {
                return $this->error('Account is suspended. Please contact support.', 403);
            }
            $role = $user->roles()->where('role', User::ROLE_PASSENGER)->first();
            if ($role && ! $role->is_active) {
                return $this->error('Passenger access is suspended. Please contact support.', 403);
            }

            DB::transaction(function () use ($user, $notifyPhone) {
                $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                $locked->update(['is_verified' => true, 'phone_normalized' => $notifyPhone]);
                $locked->ensureRole(User::ROLE_PASSENGER);
                $locked->passenger()->firstOrCreate([], ['wallet_balance' => 0]);
            });

            $user->refresh();
            $token = $user->createToken('passenger_app_token', ['role:passenger'])->plainTextToken;

            return $this->success([
                'registered' => true,
                ...$this->authPayload->for($user, User::ROLE_PASSENGER, $token),
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

        try {
            $existingUser = $this->phoneIdentities->resolve($request->phone);
        } catch (PhoneIdentityConflict $exception) {
            return $this->error($exception->getMessage(), 409);
        }
        if ($existingUser && (! $existingUser->is_active
            || $existingUser->roles()->where('role', User::ROLE_PASSENGER)->where('is_active', false)->exists())) {
            return $this->error('Passenger access is suspended. Please contact support.', 403);
        }

        $user = DB::transaction(function () use ($request, $notifyPhone) {
            $user = $this->phoneIdentities->resolve($request->phone, true);
            if (! $user) {
                $user = User::create([
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $request->email,
                    'phone' => $notifyPhone,
                    'phone_normalized' => $notifyPhone,
                    'password' => null,
                    'role' => User::ROLE_PASSENGER,
                    'is_active' => true,
                    'is_verified' => true,
                ]);
            }
            $user->ensureRole(User::ROLE_PASSENGER);
            $user->passenger()->firstOrCreate([], ['wallet_balance' => 0]);

            return $user;
        });

        $token = $user->createToken('passenger_app_token', ['role:passenger'])->plainTextToken;

        return $this->success([
            ...$this->authPayload->for($user, User::ROLE_PASSENGER, $token),
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
