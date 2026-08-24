<?php

namespace App\Services\Ledger;

use App\Models\DriverAccount;
use App\Models\JournalEntry;
use App\Models\LedgerAccount;
use App\Models\LoyaltyPointTransaction;
use App\Models\PromotionReward;
use App\Models\User;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Manual, admin-triggered rewards for signup referrals. An admin looks up who
 * used a phone number as their promo code, then pays the referrer here - a
 * ledger credit if they're a driver, loyalty points if they're a passenger.
 * Every reward is journaled through LedgerService and recorded in
 * promotion_rewards for audit, mirroring how RideSettlementService credits a
 * driver and awards loyalty points for a ride.
 */
class ReferralRewardService
{
    public function __construct(
        private readonly LedgerService $ledger,
    ) {}

    public function creditDriver(
        User $referrer,
        string $amount,
        string $note,
        User $createdBy,
        string $reference,
        ?User $referredUser = null,
    ): PromotionReward {
        $driver = $referrer->driver;

        if (! $driver) {
            throw new DomainException('This user does not have a driver account.');
        }

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
                'referred_user_id' => $referredUser?->id,
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
        ?User $referredUser = null,
    ): PromotionReward {
        $passenger = $referrer->passenger;

        if (! $passenger) {
            throw new DomainException('This user does not have a passenger account.');
        }

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
                'referred_user_id' => $referredUser?->id,
                'reward_type' => PromotionReward::TYPE_LOYALTY_POINTS,
                'amount' => $points,
                'journal_entry_id' => $entry->id,
                'note' => $note,
                'created_by' => $createdBy->id,
            ]);
        });
    }
}
