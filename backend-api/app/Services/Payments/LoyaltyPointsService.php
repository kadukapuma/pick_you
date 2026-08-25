<?php

namespace App\Services\Payments;

use App\Models\LoyaltyPointTransaction;
use App\Models\Passenger;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Services\Ledger\Money;
use DomainException;
use Illuminate\Support\Facades\DB;

/**
 * Reserve -> consume/release lifecycle for spending a passenger's earned
 * loyalty points on a ride payment. Mirrors PassengerCreditService (built for
 * wallet credit) line-for-line, using loyalty_points_balance /
 * loyalty_points_reserved_balance in place of wallet_balance /
 * wallet_reserved_balance and PaymentAllocation::TYPE_LOYALTY_POINTS in place
 * of TYPE_PICKU_CREDIT.
 *
 * Unlike PassengerCreditService::reserve()/release(), these two steps do not
 * write a LoyaltyPointTransaction row - reserving is an internal split
 * between the two balance columns, not a movement of points out of the
 * passenger's total. Only consume() writes a 'redeemed' transaction row,
 * once points have actually left the passenger permanently.
 */
class LoyaltyPointsService
{
    public function reserve(
        Payment $payment,
        string $amount,
        string $reference,
    ): ?PaymentAllocation {
        $amount = Money::of($amount);

        if (Money::cmp($amount, '0.00') <= 0) {
            throw new DomainException(
                'Reserved loyalty points must be greater than zero.'
            );
        }

        if (Money::cmp($amount, (string) $payment->amount) > 0) {
            throw new DomainException(
                'Reserved loyalty points cannot exceed the payment amount.'
            );
        }

        return DB::transaction(function () use (
            $payment,
            $amount,
            $reference,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($lockedPayment->passenger_id);

            $allocation = PaymentAllocation::query()
                ->where('payment_id', $lockedPayment->id)
                ->where(
                    'type',
                    PaymentAllocation::TYPE_LOYALTY_POINTS
                )
                ->first();

            if (
                $allocation
                && $allocation->status
                === PaymentAllocation::STATUS_RESERVED
            ) {
                return $allocation;
            }

            if (
                $allocation
                && $allocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                throw new DomainException(
                    'This payment\'s loyalty points have already been consumed.'
                );
            }

            $availableBalance = Money::of(
                $passenger->loyalty_points_balance
            );

            if (Money::isZero($availableBalance)) {
                return null;
            }

            if (Money::cmp($availableBalance, $amount) < 0) {
                $amount = $availableBalance;
            }

            $availableAfter = Money::sub(
                (string) $passenger->loyalty_points_balance,
                $amount
            );

            $reservedAfter = Money::add(
                (string) $passenger->loyalty_points_reserved_balance,
                $amount
            );

            $passenger->update([
                'loyalty_points_balance' => $availableAfter,
                'loyalty_points_reserved_balance' => $reservedAfter,
            ]);

            if ($allocation) {
                $allocation->update([
                    'amount' => $amount,
                    'status' => PaymentAllocation::STATUS_RESERVED,
                    'reserved_at' => now(),
                    'completed_at' => null,
                    'released_at' => null,
                ]);
            } else {
                $allocation = PaymentAllocation::create([
                    'payment_id' => $lockedPayment->id,
                    'type' => PaymentAllocation::TYPE_LOYALTY_POINTS,
                    'amount' => $amount,
                    'status' => PaymentAllocation::STATUS_RESERVED,
                    'reference' => $reference,
                    'reserved_at' => now(),
                ]);
            }

            return $allocation->refresh();
        }, 3);
    }

    public function release(
        PaymentAllocation $allocation,
        string $reference,
    ): PaymentAllocation {
        return DB::transaction(function () use (
            $allocation,
            $reference,
        ) {
            $payment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($allocation->payment_id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($payment->passenger_id);

            $lockedAllocation = PaymentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_RELEASED
            ) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                throw new DomainException(
                    'Consumed loyalty points cannot be released.'
                );
            }

            if (
                $lockedAllocation->status
                !== PaymentAllocation::STATUS_RESERVED
            ) {
                throw new DomainException(
                    'Only reserved loyalty points can be released.'
                );
            }

            $amount = Money::of($lockedAllocation->amount);

            if (
                Money::cmp(
                    (string) $passenger->loyalty_points_reserved_balance,
                    $amount
                ) < 0
            ) {
                throw new DomainException(
                    'Reserved loyalty points balance is inconsistent.'
                );
            }

            $availableAfter = Money::add(
                (string) $passenger->loyalty_points_balance,
                $amount
            );

            $reservedAfter = Money::sub(
                (string) $passenger->loyalty_points_reserved_balance,
                $amount
            );

            $passenger->update([
                'loyalty_points_balance' => $availableAfter,
                'loyalty_points_reserved_balance' => $reservedAfter,
            ]);

            $lockedAllocation->update([
                'status' => PaymentAllocation::STATUS_RELEASED,
                'released_at' => now(),
            ]);

            return $lockedAllocation->refresh();
        }, 3);
    }

    public function consume(
        PaymentAllocation $allocation,
        string $reference,
    ): PaymentAllocation {
        return DB::transaction(function () use (
            $allocation,
            $reference,
        ) {
            $payment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($allocation->payment_id);

            $passenger = Passenger::query()
                ->lockForUpdate()
                ->findOrFail($payment->passenger_id);

            $lockedAllocation = PaymentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($allocation->id);

            $transactionReference = "consume:{$reference}";

            $existingTransaction = LoyaltyPointTransaction::query()
                ->where('reference', $transactionReference)
                ->first();

            if ($existingTransaction) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                return $lockedAllocation;
            }

            if (
                $lockedAllocation->status
                !== PaymentAllocation::STATUS_RESERVED
            ) {
                throw new DomainException(
                    'Only reserved loyalty points can be consumed.'
                );
            }

            $amount = Money::of($lockedAllocation->amount);

            if (
                Money::cmp(
                    (string) $passenger->loyalty_points_reserved_balance,
                    $amount
                ) < 0
            ) {
                throw new DomainException(
                    'Reserved loyalty points balance is inconsistent.'
                );
            }

            $reservedAfter = Money::sub(
                (string) $passenger->loyalty_points_reserved_balance,
                $amount
            );

            $passenger->update([
                'loyalty_points_reserved_balance' => $reservedAfter,
            ]);

            $lockedAllocation->update([
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'completed_at' => now(),
            ]);

            LoyaltyPointTransaction::create([
                'passenger_id' => $passenger->id,
                'ride_id' => $payment->ride_id,
                'payment_id' => $payment->id,
                'points' => $amount,
                'type' => LoyaltyPointTransaction::TYPE_REDEEMED,
                'reference' => $transactionReference,
                'created_at' => now(),
            ]);

            return $lockedAllocation->refresh();
        }, 3);
    }
}
