<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ride;
use App\Models\Payment;
use App\Models\WalletTransaction;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    use ApiResponse;

    public function processPayment(Request $request, $ride_id)
    {
        $ride = Ride::findOrFail($ride_id);

        if ($ride->status !== 'COMPLETED') {
            return $this->error('Ride must be completed to process payment', 400);
        }

        if ($ride->payment) {
            return $this->error('Payment has already been processed for this ride', 400);
        }

        $paymentMethod = $request->payment_method ?? 'cash'; // 'cash', 'card', 'wallet'

        DB::beginTransaction();
        try {
            // Create Payment Record
            $payment = Payment::create([
                'ride_id' => $ride->id,
                'passenger_id' => $ride->passenger_id,
                'payment_method' => $paymentMethod,
                'amount' => $ride->final_fare,
                'transaction_id' => uniqid('txn_'),
                'payment_status' => $paymentMethod === 'cash' ? 'COMPLETED' : 'PENDING',
                'paid_at' => $paymentMethod === 'cash' ? now() : null,
            ]);

            // Handle Wallet Payment Logic
            if ($paymentMethod === 'wallet') {
                $passenger = $ride->passenger;
                if ($passenger->wallet_balance < $ride->final_fare) {
                    throw new \Exception('Insufficient wallet balance');
                }

                $passenger->wallet_balance -= $ride->final_fare;
                $passenger->save();

                WalletTransaction::create([
                    'user_id' => $passenger->user_id,
                    'transaction_type' => 'debit',
                    'amount' => $ride->final_fare,
                    'balance_after' => $passenger->wallet_balance,
                    'description' => "Paid for ride " . $ride->ride_code
                ]);

                $payment->update(['payment_status' => 'COMPLETED', 'paid_at' => now()]);
            }

            DB::commit();
            return $this->success($payment, 'Payment processed successfully');

        } catch (\Exception $e) {
            DB::rollBack();
            return $this->error('Payment processing failed: ' . $e->getMessage(), 500);
        }
    }
}