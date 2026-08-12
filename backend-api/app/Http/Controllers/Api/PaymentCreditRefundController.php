<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Payment;
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
}
