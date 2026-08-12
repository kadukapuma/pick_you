<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Services\Ledger\Money;
use App\Services\Payments\PickuCreditRefundService;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Throwable;

class PaymentCreditRefundController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly PickuCreditRefundService $refunds,
    ) {}

    public function store(Request $request, Payment $payment)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        try {
            $refund = $this->refunds->refund(
                payment: $payment,
                amount: (string) $validated['amount'],
                requestedBy: $request->user(),
                reason: $validated['reason'],
                idempotencyKey: (string) $request->header('Idempotency-Key'),
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        } catch (Throwable $exception) {
            report($exception);

            return $this->error('Payment refund could not be completed.', 500);
        }

        return $this->success([
            'refund' => $refund->load('walletTransaction'),
            'payment_status' => $payment->fresh()->payment_status,
            'wallet_balance' => $payment->passenger->fresh()->wallet_balance,
        ], 'Payment refunded as PickU credit successfully.', 201);
    }

    public function show(Payment $payment)
    {
        $payment->load([
            'ride:id,ride_code,status,final_fare',
            'passenger.user:id,first_name,last_name,email,phone',
            'refunds' => fn ($query) => $query->latest('id'),
        ]);

        $refunded = (string) $payment->refunds
            ->where('status', PaymentRefund::STATUS_COMPLETED)
            ->sum('amount');

        return $this->success([
            'payment' => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'payment_status' => $payment->payment_status,
                'payment_method' => $payment->payment_method,
                'paid_at' => $payment->paid_at,
            ],
            'ride' => $payment->ride,
            'passenger' => [
                'id' => $payment->passenger->id,
                'name' => trim(implode(' ', array_filter([
                    $payment->passenger->user?->first_name,
                    $payment->passenger->user?->last_name,
                ]))),
                'email' => $payment->passenger->user?->email,
                'phone' => $payment->passenger->user?->phone,
                'wallet_balance' => $payment->passenger->wallet_balance,
            ],
            'refunded_amount' => Money::of($refunded),
            'refundable_amount' => Money::cmp((string) $payment->amount, $refunded) >= 0
                ? Money::sub((string) $payment->amount, $refunded)
                : '0.00',
            'refunds' => $payment->refunds,
        ], 'Payment refund details retrieved successfully.');
    }
}
