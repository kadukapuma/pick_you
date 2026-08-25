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
            'promo_code' => 'nullable|string|max:20',
        ]);
        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            $phone = $this->phones->normalize($request->phone);
        } catch (InvalidArgumentException $exception) {
            return $this->error($exception->getMessage(), 422, ['phone' => [$exception->getMessage()]]);
        }

        $promoCode = null;
        if ($request->filled('promo_code')) {
            try {
                $promoCode = $this->phones->normalize($request->promo_code);
            } catch (InvalidArgumentException) {
                return $this->error('Enter a valid phone number as the promotion code.', 422, [
                    'promo_code' => ['Enter a valid phone number as the promotion code.'],
                ]);
            }
            if ($promoCode === $phone) {
                return $this->error('You cannot use your own phone number as a promotion code.', 422, [
                    'promo_code' => ['You cannot use your own phone number as a promotion code.'],
                ]);
            }
            if (! User::where('phone_normalized', $promoCode)->exists()) {
                return $this->error('This promotion code does not match a PickU account.', 422, [
                    'promo_code' => ['This promotion code does not match a PickU account.'],
                ]);
            }
        }

        $email = mb_strtolower(trim($request->email));
        if (DriverCredential::where('login_email', $email)->exists()) {
            return $this->error('A driver account already uses this email. Please log in.', 409);
        }
        if (User::where('email', $email)->exists()) {
            return $this->error('This email is already associated with another PickU account.', 409);
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
            'promo_code' => $promoCode,
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

                $referredBy = $locked->promo_code
                    ? User::where('phone_normalized', $locked->promo_code)->first()
                    : null;

                $user = $this->phoneIdentities->resolve($locked->phone_normalized, true);
                if (! $user) {
                    $user = User::create([
                        'first_name' => $locked->first_name,
                        'last_name' => $locked->last_name,
                        'email' => $locked->login_email,
                        'phone' => $locked->phone_normalized,
                        'phone_normalized' => $locked->phone_normalized,
                        'promo_code' => $locked->promo_code,
                        'referred_by_user_id' => $referredBy?->id,
                        'password' => null,
                        'role' => User::ROLE_DRIVER,
                        'is_active' => true,
                        'is_verified' => true,
                    ]);
                } else {
                    // An existing identity (e.g. already a passenger) keeps its own
                    // email; only backfill if it never had one, so the driver
                    // registration email never silently overwrites a verified one.
                    // Same for the promo code: it's write-once, set only if this
                    // identity never recorded one.
                    $user->update([
                        'phone_normalized' => $locked->phone_normalized,
                        'is_verified' => true,
                        'email' => $user->email ?: $locked->login_email,
                        'promo_code' => $user->promo_code ?: $locked->promo_code,
                        'referred_by_user_id' => $user->referred_by_user_id ?: $referredBy?->id,
                    ]);
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
