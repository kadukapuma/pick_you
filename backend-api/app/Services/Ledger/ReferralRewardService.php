<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\LoyaltyPointTransaction;
use App\Models\PromotionReward;
use App\Models\User;
use App\Services\Rides\RideStateMachine;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Manual, admin-triggered rewards for signup referrals. An admin looks up who
 * used a phone number as their promo code, then pays the referrer here - a
 * ledger credit if they're a driver, loyalty points if they're a passenger.
 * Every reward is journaled through LedgerService and recorded in
 * promotion_rewards for audit, mirroring how RideSettlementService credits a
 * driver and awards loyalty points for a ride.
 *
 * Rewards are earned per qualifying referral, not handed out on request: the
 * referred user must have actually signed up with this referrer's phone
 * number as their promo code, completed at least MIN_COMPLETED_RIDES_FOR_REWARD
 * rides, and not already triggered a reward for this referrer.
 */
class ReferralRewardService
{
    public const MIN_COMPLETED_RIDES_FOR_REWARD = 1;

    public function __construct(
        private readonly LedgerService $ledger,
    ) {}

    public static function completedRideCount(User $user): int
    {
        $user->loadMissing(['driver', 'passenger']);

        $driverRides = $user->driver
            ? $user->driver->rides()->where('status', RideStateMachine::COMPLETED)->count()
            : 0;
        $passengerRides = $user->passenger
            ? $user->passenger->rides()->where('status', RideStateMachine::COMPLETED)->count()
            : 0;

        return $driverRides + $passengerRides;
    }

    private function assertQualifies(User $referrer, User $referredUser): void
    {
        if ($referredUser->referred_by_user_id !== $referrer->id) {
            throw new DomainException('This user was not referred by this promotion code owner.');
        }

        $completedRides = self::completedRideCount($referredUser);

        if ($completedRides < self::MIN_COMPLETED_RIDES_FOR_REWARD) {
            throw new DomainException(
                "This referred user has only {$completedRides} completed ride(s); at least "
                    .self::MIN_COMPLETED_RIDES_FOR_REWARD.' are required before a reward can be issued.'
            );
        }

        if (PromotionReward::where('referred_user_id', $referredUser->id)->exists()) {
            throw new DomainException('A reward has already been issued for this referred signup.');
        }
    }

    public function creditDriver(
        User $referrer,
        string $amount,
        string $note,
        User $createdBy,
        string $reference,
        User $referredUser,
    ): PromotionReward {
        $driver = $referrer->driver;

        if (! $driver) {
            throw new DomainException('This user does not have a driver account.');
        }

        $this->assertQualifies($referrer, $referredUser);

        return DB::transaction(function () use ($driver, $referrer, $amount, $note, $createdBy, $reference, $referredUser) {
            $account = DriverAccount::forDriver((int) $driver->id);

            $entry = $this->ledger->post(
                type: JournalEntry::TYPE_REFERRAL_BONUS_DRIVER,
                idempotencyKey: "referral-driver:{$reference}",
                description: "Referral bonus: {$note}",
                lines: [
                    ['account' => 'REFERRAL_EXPENSE', 'debit' => $amount],
                    ['account' => LedgerAccount::codeForDriver((int) $driver->id), 'credit' => $amount],
                ],
                reference: $account,
                createdBy: $createdBy->id,
            );

            return PromotionReward::create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $referredUser->id,
                'reward_type' => PromotionReward::TYPE_DRIVER_CREDIT,
                'amount' => $amount,
                'journal_entry_id' => $entry->id,
                'note' => $note,
                'created_by' => $createdBy->id,
            ]);
        });
    }

    public function creditPassengerLoyalty(
        User $referrer,
        string $points,
        string $note,
        User $createdBy,
        string $reference,
        User $referredUser,
    ): PromotionReward {
        $passenger = $referrer->passenger;

        if (! $passenger) {
            throw new DomainException('This user does not have a passenger account.');
        }

        $this->assertQualifies($referrer, $referredUser);

        return DB::transaction(function () use ($passenger, $referrer, $points, $note, $createdBy, $reference, $referredUser) {
            $entry = $this->ledger->post(
                type: JournalEntry::TYPE_REFERRAL_BONUS_LOYALTY,
                idempotencyKey: "referral-loyalty:{$reference}",
                description: "Referral bonus: {$note}",
                lines: [
                    ['account' => 'REFERRAL_EXPENSE', 'debit' => $points],
                    ['account' => 'PASSENGER_LOYALTY_LIABILITY', 'credit' => $points],
                ],
                reference: $passenger,
                createdBy: $createdBy->id,
            );

            $passenger->increment('loyalty_points_balance', $points);

            LoyaltyPointTransaction::create([
                'passenger_id' => $passenger->id,
                'points' => $points,
                'type' => LoyaltyPointTransaction::TYPE_EARNED,
                'source' => LoyaltyPointTransaction::SOURCE_REFERRAL_BONUS,
                'reference' => $note,
                'created_at' => now(),
            ]);

            return PromotionReward::create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $referredUser->id,
                'reward_type' => PromotionReward::TYPE_LOYALTY_POINTS,
                'amount' => $points,
                'journal_entry_id' => $entry->id,
                'note' => $note,
                'created_by' => $createdBy->id,
            ]);
        });
    }
}
