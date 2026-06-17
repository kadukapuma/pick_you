<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\WalletTransaction;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

class PaymentController extends Controller
{
    use ApiResponse;

    public function processPayment(Request $request, $ride_id)
    {
        $ride = Ride::findOrFail($ride_id);

        if ($request->user()->cannot('processPayment', $ride)) {
            return $this->error('You are not authorized to process payment for this ride', 403);
        }

        $validated = $request->validate([
            'payment_method' => 'sometimes|in:cash,card,wallet',
        ]);
        $paymentMethod = $validated['payment_method'] ?? 'cash';

        try {
            $payment = DB::transaction(function () use ($ride_id, $paymentMethod) {
                $lockedRide = Ride::lockForUpdate()->findOrFail($ride_id);

                if ($lockedRide->status !== 'COMPLETED') {
                    throw new DomainException('Ride must be completed to process payment.');
                }

                $existingPayment = Payment::where('ride_id', $lockedRide->id)->first();
                if ($existingPayment) {
                    return $existingPayment;
                }

                $payment = Payment::create([
                    'ride_id' => $lockedRide->id,
                    'passenger_id' => $lockedRide->passenger_id,
                    'payment_method' => $paymentMethod,
                    'amount' => $lockedRide->final_fare,
                    'transaction_id' => 'txn_'.bin2hex(random_bytes(16)),
                    'payment_status' => $paymentMethod === 'cash' ? 'COMPLETED' : 'PENDING',
                    'paid_at' => $paymentMethod === 'cash' ? now() : null,
                ]);

                if ($paymentMethod !== 'wallet') {
                    return $payment;
                }

                $passenger = $lockedRide->passenger()->lockForUpdate()->firstOrFail();
                if ((float) $passenger->wallet_balance < (float) $lockedRide->final_fare) {
                    throw new DomainException('Insufficient wallet balance.');
                }

                $passenger->decrement('wallet_balance', $lockedRide->final_fare);
                $passenger->refresh();

                WalletTransaction::create([
                    'user_id' => $passenger->user_id,
                    'transaction_type' => 'debit',
                    'amount' => $lockedRide->final_fare,
                    'balance_after' => $passenger->wallet_balance,
                    'description' => 'Paid for ride '.$lockedRide->ride_code,
                ]);

                $payment->update(['payment_status' => 'COMPLETED', 'paid_at' => now()]);

                return $payment->refresh();
            }, 3);
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        } catch (Throwable) {
            return $this->error('Payment processing failed.', 500);
        }

        return $this->success($payment, 'Payment processed successfully');
    }
}
