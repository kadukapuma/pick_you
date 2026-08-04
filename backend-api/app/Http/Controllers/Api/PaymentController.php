<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentAttemptStatus;
use App\Enums\PaymentStatus;
use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\Ride;
use App\Models\WalletTransaction;
use App\Models\PaymentAttempt;
use App\Models\PaymentEvent;
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

            // if ($payment->payment_status === 'PENDING' && $paymentMethod === 'card') {
            //     $payment = $this->captureCard($payment);
            // }
            $hasNoAttempts = ! $payment->attempts()->exists();

            $canStartFirstAttempt = $hasNoAttempts
                && $payment->payment_status === PaymentStatus::PENDING->value;

            $canRetry = in_array($payment->payment_status, [
                PaymentStatus::DECLINED->value,
                PaymentStatus::FAILED->value,
                PaymentStatus::CANCELLED->value,
            ], true);

            if (
                $paymentMethod === 'card'
                && ($canStartFirstAttempt || $canRetry)
            ) {
                $payment = $this->prepareCardRetry($payment);
                $attempt = $this->createCardAttempt($payment);
                $payment = $this->captureCard($payment, $attempt);
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

        if (in_array($payment->payment_status, [
            PaymentStatus::DECLINED->value,
            PaymentStatus::FAILED->value,
        ], true)) {
            return $this->error(
                $payment->failure_reason ?: 'Card payment failed. Please collect cash or try another card.',
                402,
            );
        }

        if (in_array($payment->payment_status, [
            PaymentStatus::PENDING->value,
            PaymentStatus::UNKNOWN->value,
        ], true)) {
            return $this->success(
                $payment,
                'Payment status is awaiting confirmation.',
                202,
            );
        }

        if ($payment->payment_status === PaymentStatus::CANCELLED->value) {
            return $this->error(
                $payment->failure_reason ?: 'Payment was cancelled.',
                409,
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

    public function show(Request $request, Ride $ride)
    {
        if ($request->user()->cannot('view', $ride)) {
            return $this->error(
                'You are not authorized to view this payment.',
                403
            );
        }

        $payment = $ride->payment()
            ->with([
                'attempts' => fn($query) => $query
                    ->orderByDesc('attempt_number'),
            ])
            ->first();

        return $this->success([
            'ride_id' => $ride->id,
            'payment_method' => $ride->payment_method,
            'final_fare' => $ride->final_fare,
            'payment' => $payment,
        ]);
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
                'transaction_id' => 'txn_' . bin2hex(random_bytes(16)),
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
                    'description' => 'Paid for ride ' . $lockedRide->ride_code,
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


    private function createCardAttempt(Payment $payment): PaymentAttempt
    {
        return DB::transaction(function () use ($payment) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($lockedPayment->payment_status === 'COMPLETED') {
                throw new DomainException('Payment has already been completed.');
            }

            $nextAttemptNumber = ((int) $lockedPayment->attempts()->max('attempt_number')) + 1;

            $attempt = $lockedPayment->attempts()->create([
                'attempt_number' => $nextAttemptNumber,
                'gateway' => $this->gateway()->name(),
                'merchant_order_id' => sprintf(
                    'PKU-R%d-P%d-A%02d',
                    $lockedPayment->ride_id,
                    $lockedPayment->id,
                    $nextAttemptNumber
                ),
                'status' => PaymentAttemptStatus::PROCESSING->value,
                'amount' => $lockedPayment->amount,
                'currency' => 'LKR',
                'started_at' => now(),
            ]);

            $lockedPayment->events()->create([
                'payment_attempt_id' => $attempt->id,
                'event_type' => 'ATTEMPT_CREATED',
                'source' => 'backend',
                'metadata' => [
                    'attempt_number' => $nextAttemptNumber,
                    'merchant_order_id' => $attempt->merchant_order_id,
                ],
            ]);

            return $attempt;
        }, 3);
    }


    private function prepareCardRetry(Payment $payment): Payment
    {
        return DB::transaction(function () use ($payment) {
            $locked = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($locked->payment_status === 'COMPLETED') {
                return $locked;
            }

            if (! in_array($locked->payment_status, [
                PaymentStatus::PENDING->value,
                PaymentStatus::DECLINED->value,
                PaymentStatus::FAILED->value,
                PaymentStatus::CANCELLED->value,
            ], true)) {
                throw new DomainException(
                    'This card payment cannot currently be retried.'
                );
            }

            $locked->update([
                'payment_status' => PaymentStatus::PENDING->value,
                'failure_reason' => null,
                'gateway_reference' => null,
            ]);

            return $locked->refresh();
        }, 3);
    }


    private function captureCard(
        Payment $payment,
        PaymentAttempt $attempt
    ): Payment {
        $method = PassengerPaymentMethod::query()
            ->where('passenger_id', $payment->passenger_id)
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->first();

        if (! $method) {
            throw new DomainException(
                'No saved card for this passenger. Please add a card or pay cash.'
            );
        }

        $result = $this->gateway()->capture($payment, $method);

        return DB::transaction(function () use ($payment, $attempt, $result) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $lockedAttempt = PaymentAttempt::query()
                ->lockForUpdate()
                ->findOrFail($attempt->id);

            if ($lockedPayment->payment_status === 'COMPLETED') {
                return $lockedPayment;
            }

            if (! $result->successful) {
                $lockedAttempt->update([
                    'status' => $result->status->value,
                    'gateway_reference' => $result->reference,
                    'failure_reason' => $result->failureReason,
                    'completed_at' => $result->status === PaymentAttemptStatus::PENDING
                        ? null
                        : now(),
                ]);

                $lockedPayment->update([
                    'payment_status' => PaymentStatus::from(
                        $result->status->value
                    )->value,
                    'gateway' => $result->gateway,
                    'gateway_reference' => null,
                    'failure_reason' => $result->failureReason,
                ]);

                PaymentEvent::create([
                    'payment_id' => $lockedPayment->id,
                    'payment_attempt_id' => $lockedAttempt->id,
                    'event_type' => 'PAYMENT_' . $result->status->value,
                    'source' => 'gateway',
                    'provider_reference' => $result->reference,
                    'metadata' => [
                        'reason' => $result->failureReason,
                    ],
                ]);

                return $lockedPayment->refresh();
            }

            $lockedAttempt->update([
                'status' => PaymentAttemptStatus::COMPLETED->value,
                'gateway_reference' => $result->reference,
                'completed_at' => now(),
                'failure_reason' => null,
            ]);

            $lockedPayment->update([
                'payment_status' => PaymentStatus::COMPLETED->value,
                'paid_at' => now(),
                'gateway' => $result->gateway,
                'gateway_reference' => $result->reference,
                'failure_reason' => null,
            ]);

            PaymentEvent::create([
                'payment_id' => $lockedPayment->id,
                'payment_attempt_id' => $lockedAttempt->id,
                'event_type' => 'PAYMENT_COMPLETED',
                'source' => 'gateway',
                'provider_reference' => $result->reference,
                'metadata' => [
                    'amount' => $lockedPayment->amount,
                    'currency' => 'LKR',
                ],
            ]);

            $this->settlement->settle($lockedPayment->refresh());

            return $lockedPayment->refresh();
        }, 3);
    }
}
