<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PromotionReward;
use App\Models\User;
use App\Services\Auth\PhoneNumberNormalizer;
use App\Services\Ledger\ReferralRewardService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;

class AdminPromotionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PhoneNumberNormalizer $phones,
    ) {}

    /**
     * Look up a phone number and show everyone who registered with it as
     * their promotion code, plus the referrer's own account (which may be a
     * driver, a passenger, or both).
     */
    public function search(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string|max:20',
            'page' => 'sometimes|integer|min:1',
        ]);

        try {
            $normalized = $this->phones->normalize($validated['phone']);
        } catch (\InvalidArgumentException $exception) {
            return $this->error($exception->getMessage(), 422, ['phone' => [$exception->getMessage()]]);
        }

        $referrer = User::with(['driver', 'passenger'])
            ->where('phone_normalized', $normalized)
            ->first();

        if (! $referrer) {
            return $this->error('No PickU account uses this phone number.', 404);
        }

        $referredUsers = User::query()
            ->where('promo_code', $normalized)
            ->orderByDesc('created_at')
            ->paginate(20, page: $validated['page'] ?? 1);

        $referredUsers->getCollection()->transform(fn (User $user) => [
            'id' => $user->id,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'phone' => $user->phone,
            'roles' => $user->activeRoles(),
            'registered_at' => optional($user->created_at)->toDateTimeString(),
        ]);

        $rewards = PromotionReward::query()
            ->where('referrer_user_id', $referrer->id)
            ->orderByDesc('created_at')
            ->with('referredUser:id,first_name,last_name,phone')
            ->get();

        return $this->success([
            'referrer' => [
                'id' => $referrer->id,
                'name' => trim($referrer->first_name . ' ' . $referrer->last_name),
                'phone' => $referrer->phone,
                'roles' => $referrer->activeRoles(),
                'is_driver' => (bool) $referrer->driver,
                'is_passenger' => (bool) $referrer->passenger,
                // Rough activity signal for whoever is reviewing the referral,
                // not a precise trips report - total rides regardless of status.
                'total_rides_as_driver' => $referrer->driver ? $referrer->driver->rides()->count() : null,
                'total_rides_as_passenger' => $referrer->passenger ? $referrer->passenger->rides()->count() : null,
            ],
            'referred_count' => $referredUsers->total(),
            'referred_users' => $referredUsers,
            'rewards' => $rewards,
        ], 'Promotion lookup retrieved successfully.');
    }

    /**
     * Every user, with a rough count of how many signups used their phone
     * number as a promotion code - a leaderboard-style view of promo code
     * usage across the whole user base, independent of any single lookup.
     */
    public function usage(Request $request)
    {
        $validated = $request->validate([
            'search' => 'sometimes|string|max:100',
            'page' => 'sometimes|integer|min:1',
        ]);

        $query = User::query()->withCount('referredUsers');

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                    ->orWhere('last_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        $users = $query
            ->orderByDesc('referred_users_count')
            ->orderByDesc('created_at')
            ->paginate(20, page: $validated['page'] ?? 1);

        $users->getCollection()->transform(fn (User $user) => [
            'id' => $user->id,
            'name' => trim($user->first_name . ' ' . $user->last_name),
            'phone' => $user->phone,
            'roles' => $user->activeRoles(),
            'promo_code_use_count' => $user->referred_users_count,
        ]);

        return $this->success($users, 'Promotion code usage retrieved successfully.');
    }

    public function rewardDriver(Request $request, $userId, ReferralRewardService $rewards)
    {
        $referrer = User::find($userId);

        if (! $referrer) {
            return $this->error('User not found.', 404);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01|max:1000000',
            'note' => 'required|string|max:500',
            'referred_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $idempotencyKey = trim((string) $request->header('Idempotency-Key'));
        $reference = sprintf('%d:%d:%s', $request->user()->id, $referrer->id, $idempotencyKey);

        try {
            $reward = $rewards->creditDriver(
                referrer: $referrer,
                amount: (string) $validated['amount'],
                note: $validated['note'],
                createdBy: $request->user(),
                reference: $reference,
                referredUser: isset($validated['referred_user_id']) ? User::find($validated['referred_user_id']) : null,
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        }

        return $this->success($reward, 'Referral driver credit recorded successfully.', 201);
    }

    public function rewardLoyalty(Request $request, $userId, ReferralRewardService $rewards)
    {
        $referrer = User::find($userId);

        if (! $referrer) {
            return $this->error('User not found.', 404);
        }

        $validated = $request->validate([
            'points' => 'required|numeric|min:0.01|max:1000000',
            'note' => 'required|string|max:500',
            'referred_user_id' => 'nullable|integer|exists:users,id',
        ]);

        $idempotencyKey = trim((string) $request->header('Idempotency-Key'));
        $reference = sprintf('%d:%d:%s', $request->user()->id, $referrer->id, $idempotencyKey);

        try {
            $reward = $rewards->creditPassengerLoyalty(
                referrer: $referrer,
                points: (string) $validated['points'],
                note: $validated['note'],
                createdBy: $request->user(),
                reference: $reference,
                referredUser: isset($validated['referred_user_id']) ? User::find($validated['referred_user_id']) : null,
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        }

        return $this->success($reward, 'Referral loyalty points recorded successfully.', 201);
    }
}
