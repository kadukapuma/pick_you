<?php

namespace App\Http\Controllers\Api;

use App\Events\DriverCreated;
use App\Http\Controllers\Controller;
use App\Models\DriverCredential;
use App\Models\OtpVerification;
use App\Models\PendingDriverEnrollment;
use App\Models\User;
use App\Services\Auth\AuthPayload;
use App\Services\Auth\NotifySmsSender;
use App\Services\Auth\OtpCodeService;
use App\Services\Auth\PhoneIdentityConflict;
use App\Services\Auth\PhoneIdentityResolver;
use App\Services\Auth\PhoneNumberNormalizer;
use App\Traits\ApiResponse;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use InvalidArgumentException;

class DriverAuthController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PhoneNumberNormalizer $phones,
        private readonly PhoneIdentityResolver $phoneIdentities,
        private readonly AuthPayload $authPayload,
        private readonly NotifySmsSender $sms,
        private readonly OtpCodeService $otpCodes,
    ) {}

    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'password' => 'required|string|min:8|confirmed',
        ]);
        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            $phone = $this->phones->normalize($request->phone);
        } catch (InvalidArgumentException $exception) {
            return $this->error($exception->getMessage(), 422, ['phone' => [$exception->getMessage()]]);
        }

        $email = mb_strtolower(trim($request->email));
        if (DriverCredential::where('login_email', $email)->exists()) {
            return $this->error('A driver account already uses this email. Please log in.', 409);
        }

        try {
            $existingUser = $this->phoneIdentities->resolve($phone);
        } catch (PhoneIdentityConflict $exception) {
            return $this->error($exception->getMessage(), 409);
        }
        if ($existingUser?->driver) {
            return $this->error('This phone number already has a driver account. Please log in.', 409);
        }

        $rawToken = Str::random(64);
        PendingDriverEnrollment::where('phone_normalized', $phone)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);
        PendingDriverEnrollment::create([
            'token_hash' => hash('sha256', $rawToken),
            'phone_normalized' => $phone,
            'first_name' => trim($request->first_name),
            'last_name' => trim($request->last_name),
            'login_email' => $email,
            'password' => Hash::make($request->password),
            'expires_at' => now()->addMinutes(15),
        ]);

        return $this->success([
            'enrollment_token' => $rawToken,
            'phone' => $phone,
            'expires_at' => now()->addMinutes(15)->toIso8601String(),
        ], 'Verify your phone number to complete driver registration', 202);
    }

    public function sendOtp(Request $request)
    {
        $request->validate(['enrollment_token' => 'required|string']);
        $enrollment = $this->pending($request->enrollment_token);
        if (! $enrollment) {
            return $this->error('Driver enrollment is invalid or expired.', 410);
        }

        $otpCode = $this->otpCodes->generate();
        OtpVerification::create([
            'contact' => $enrollment->phone_normalized,
            'purpose' => 'driver_registration',
            'otp_code' => $this->otpCodes->storeValue($otpCode),
            'is_verified' => false,
            'expires_at' => now()->addMinutes(5),
        ]);

        if (! $this->sms->send(
            $enrollment->phone_normalized,
            "Your OTP: {$otpCode} Please use the above PickYou OTP to complete your driver registration. Do not share this OTP with anyone.",
        )) {
            return $this->error('Failed to send OTP SMS', 502);
        }

        return $this->success($this->otpCodes->debugPayload($otpCode), 'OTP sent successfully');
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'enrollment_token' => 'required|string',
            'otp_code' => 'required|string|size:4',
        ]);
        $pending = $this->pending($request->enrollment_token);
        if (! $pending) {
            return $this->error('Driver enrollment is invalid or expired.', 410);
        }

        $otp = OtpVerification::where('contact', $pending->phone_normalized)
            ->where('purpose', 'driver_registration')
            ->where('is_verified', false)
            ->where('expires_at', '>', now())
            ->latest()
            ->get()
            ->first(fn (OtpVerification $otp) => $this->otpCodes->matches((string) $request->otp_code, $otp->otp_code));
        if (! $otp) {
            return $this->error('Invalid or expired OTP', 400);
        }

        try {
            [$user, $driver, $created] = DB::transaction(function () use ($pending, $otp) {
                $locked = PendingDriverEnrollment::whereKey($pending->id)->lockForUpdate()->firstOrFail();
                if ($locked->consumed_at || $locked->expires_at->isPast()) {
                    throw new InvalidArgumentException('Driver enrollment is invalid or expired.');
                }

                $user = $this->phoneIdentities->resolve($locked->phone_normalized, true);
                if (! $user) {
                    $user = User::create([
                        'first_name' => $locked->first_name,
                        'last_name' => $locked->last_name,
                        'email' => null,
                        'phone' => $locked->phone_normalized,
                        'phone_normalized' => $locked->phone_normalized,
                        'password' => null,
                        'role' => User::ROLE_DRIVER,
                        'is_active' => true,
                        'is_verified' => true,
                    ]);
                } else {
                    $user->update(['phone_normalized' => $locked->phone_normalized, 'is_verified' => true]);
                }
                if ($user->driver) {
                    throw new InvalidArgumentException('This phone number already has a driver account.');
                }

                $user->ensureRole(User::ROLE_DRIVER);
                $driver = $user->driver()->create([
                    'status' => 'pending', 'availability' => 0, 'rating' => 0,
                ]);
                DriverCredential::create([
                    'driver_id' => $driver->id,
                    'login_email' => $locked->login_email,
                    'password' => $locked->password,
                ]);
                $locked->update(['consumed_at' => now()]);
                $otp->update(['is_verified' => true, 'user_id' => $user->id]);

                return [$user, $driver, true];
            }, 3);
        } catch (InvalidArgumentException|PhoneIdentityConflict $exception) {
            return $this->error($exception->getMessage(), 409);
        } catch (QueryException) {
            return $this->error('The phone number or driver email is already registered.', 409);
        }

        if ($created) {
            event(new DriverCreated($driver->loadMissing(['user', 'vehicles.images'])));
        }
        $token = $user->createToken('driver_app_token', ['role:driver'])->plainTextToken;

        return $this->success(
            $this->authPayload->for($user, User::ROLE_DRIVER, $token),
            'Driver registration completed successfully',
            201,
        );
    }

    public function login(Request $request)
    {
        $request->validate(['email' => 'required|email', 'password' => 'required|string']);
        $credential = DriverCredential::with('driver.user')
            ->where('login_email', mb_strtolower(trim($request->email)))
            ->first();
        $user = $credential?->driver?->user;
        if (! $credential || ! $user || ! Hash::check($request->password, $credential->password)) {
            return $this->error('Invalid credentials', 401);
        }
        if (! $user->is_active || ! $user->hasActiveRole(User::ROLE_DRIVER)) {
            return $this->error('Driver access is suspended.', 403);
        }

        $token = $user->createToken('driver_app_token', ['role:driver'])->plainTextToken;

        return $this->success($this->authPayload->for($user, User::ROLE_DRIVER, $token), 'Driver logged in successfully');
    }

    private function pending(string $token): ?PendingDriverEnrollment
    {
        return PendingDriverEnrollment::where('token_hash', hash('sha256', $token))
            ->whereNull('consumed_at')->where('expires_at', '>', now())->first();
    }
}
