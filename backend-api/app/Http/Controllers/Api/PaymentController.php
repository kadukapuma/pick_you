<?php

namespace App\Http\Controllers\Api;

use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\WalletTransaction;
use App\Services\Ledger\RideSettlementService;
use App\Services\Payments\PaymentGateway;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly RideSettlementService $settlement,
    ) {}

    /**
     * Resolved lazily, and only on the card path. Injecting it in the
     * constructor would mean a gateway misconfiguration - such as the mock
     * refusing to bind in production - also breaks cash payments, which need
     * no gateway at all.
     */
    private function gateway(): PaymentGateway
    {
        return app(PaymentGateway::class);
    }

    public function processPayment(Request $request, $ride_id)
    {
        $ride = Ride::findOrFail($ride_id);

        if ($request->user()->cannot('processPayment', $ride)) {
            return $this->error('You are not authorized to process payment for this ride', 403);
        }

        // The method is whatever the passenger chose at booking. Taking it from
        // the request body would let the confirming party pick the branch that
        // suits them - a driver could confirm "cash" on a card ride and be
        // debited commission while the gateway also charges the passenger.
        $paymentMethod = $ride->payment_method ?: 'cash';

        if ($request->filled('payment_method') && $request->input('payment_method') !== $paymentMethod) {
            Log::warning('Payment method in request differs from the ride; using the ride.', [
                'ride_id' => $ride->id,
                'requested' => $request->input('payment_method'),
                'ride' => $paymentMethod,
            ]);
        }

        try {
            [$payment, $alreadyProcessed] = $this->createOrFetchPayment($ride->id, $paymentMethod);

            if ($payment->payment_status === 'PENDING' && $paymentMethod === 'card') {
                $payment = $this->captureCard($payment);
            }
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 422);
        } catch (Throwable $exception) {
            Log::error('Payment processing failed.', [
                'ride_id' => $ride->id,
                'error' => $exception->getMessage(),
            ]);

            return $this->error('Payment processing failed.', 500);
        }

        if ($payment->payment_status === 'FAILED') {
            return $this->error(
                $payment->failure_reason ?: 'Card payment failed. Please collect cash or try another card.',
                402,
            );
        }

        // The money is already committed at this point. A broadcast failure must
        // not turn a successful payment into a 500 the driver will retry.
        try {
            event(new RideStatusUpdated(Ride::findOrFail($ride->id)));
        } catch (Throwable $exception) {
            Log::warning('Could not broadcast ride status after payment.', [
                'ride_id' => $ride->id,
                'error' => $exception->getMessage(),
            ]);
        }

        return $this->success(
            $payment,
            $alreadyProcessed ? 'Payment already processed.' : 'Payment processed successfully'
        );
    }

    /**
     * Create the payment and, for anything settled instantly, post the ledger
     * entry in the same transaction so money and books commit together.
     *
     * @return array{0: Payment, 1: bool}
     */
    private function createOrFetchPayment(int $rideId, string $paymentMethod): array
    {
        return DB::transaction(function () use ($rideId, $paymentMethod) {
            $lockedRide = Ride::lockForUpdate()->findOrFail($rideId);

            if ($lockedRide->status !== 'COMPLETED') {
                throw new DomainException('Ride must be completed to process payment.');
            }

            $existingPayment = Payment::where('ride_id', $lockedRide->id)->first();
            if ($existingPayment) {
                return [$existingPayment, $existingPayment->payment_status === 'COMPLETED'];
            }

            $amount = (float) $lockedRide->final_fare > 0
                ? $lockedRide->final_fare
                : $lockedRide->estimated_fare;

            $payment = Payment::create([
                'ride_id' => $lockedRide->id,
                'passenger_id' => $lockedRide->passenger_id,
                'payment_method' => $paymentMethod,
                'amount' => $amount,
                'transaction_id' => 'txn_'.bin2hex(random_bytes(16)),
                'payment_status' => $paymentMethod === 'cash' ? 'COMPLETED' : 'PENDING',
                'paid_at' => $paymentMethod === 'cash' ? now() : null,
            ]);

            if ($paymentMethod === 'cash') {
                $this->settlement->settle($payment);

                return [$payment->refresh(), false];
            }

            if ($paymentMethod === 'wallet') {
                $passenger = $lockedRide->passenger()->lockForUpdate()->firstOrFail();

                if ((float) $passenger->wallet_balance < (float) $amount) {
                    throw new DomainException('Insufficient wallet balance.');
                }

                $passenger->decrement('wallet_balance', $amount);
                $passenger->refresh();

                WalletTransaction::create([
                    'user_id' => $passenger->user_id,
                    'transaction_type' => 'debit',
                    'amount' => $amount,
                    'balance_after' => $passenger->wallet_balance,
                    'description' => 'Paid for ride '.$lockedRide->ride_code,
                ]);

                $payment->update(['payment_status' => 'COMPLETED', 'paid_at' => now()]);
                $this->settlement->settle($payment->refresh());

                return [$payment->refresh(), false];
            }

            // Card: nothing has moved yet. Capture happens outside this
            // transaction so gateway I/O never runs while holding row locks.
            return [$payment, false];
        }, 3);
    }

    /**
     * Capture the card, then record the outcome and settle in a second
     * transaction. This is the same shape a real gateway webhook will take.
     */
    private function captureCard(Payment $payment): Payment
    {
        $method = PassengerPaymentMethod::query()
            ->where('passenger_id', $payment->passenger_id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();

        if (! $method) {
            throw new DomainException('No saved card for this passenger. Please add a card or pay cash.');
        }

        $result = $this->gateway()->capture($payment, $method);

        return DB::transaction(function () use ($payment, $result) {
            $locked = Payment::lockForUpdate()->findOrFail($payment->id);

            if ($locked->payment_status === 'COMPLETED') {
                return $locked;
            }

            if (! $result->successful) {
                $locked->update([
                    'payment_status' => 'FAILED',
                    'gateway' => $result->gateway,
                    'failure_reason' => $result->failureReason,
                ]);

                return $locked->refresh();
            }

            $locked->update([
                'payment_status' => 'COMPLETED',
                'paid_at' => now(),
                'gateway' => $result->gateway,
                'gateway_reference' => $result->reference,
            ]);

            $this->settlement->settle($locked->refresh());

            return $locked->refresh();
        }, 3);
    }
}
