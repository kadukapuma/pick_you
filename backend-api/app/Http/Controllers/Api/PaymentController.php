<?php

namespace App\Http\Controllers\Api;

use App\Enums\PaymentAttemptStatus;
use App\Enums\PaymentStatus;
use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\PaymentAllocation;
use App\Models\PaymentAttempt;
use App\Models\PaymentEvent;
use App\Models\Ride;
use App\Models\WalletTransaction;
use App\Services\Ledger\Money;
use App\Services\Ledger\RideSettlementService;
use App\Services\Payments\LoyaltyPointsService;
use App\Services\Payments\PassengerCreditService;
use App\Services\Payments\PaymentGateway;
use App\Traits\ApiResponse;
use DateTimeInterface;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Throwable;

class PaymentController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly RideSettlementService $settlement,
        private readonly PassengerCreditService $credits,
        private readonly LoyaltyPointsService $loyaltyPoints,
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

    public function createWebxpayCheckout(
        Request $request,
        Ride $ride
    ) {
        if (! config('payments.webxpay.enabled')) {
            return $this->error(
                'WEBXPAY checkout is currently unavailable.',
                503
            );
        }
        if ($request->user()->cannot('processPayment', $ride)) {
            return $this->error(
                'You are not authorized to create checkout for this ride.',
                403
            );
        }

        if ($ride->payment_method !== 'card') {
            return $this->error(
                'WEBXPAY checkout requires a card ride.',
                422
            );
        }

        if ($ride->status !== 'COMPLETED') {
            return $this->error(
                'Ride must be completed before checkout.',
                422
            );
        }
        $existingPayment = $ride->payment()->first();

        if (
            $existingPayment
            && $existingPayment->payment_status
            === PaymentStatus::COMPLETED->value
        ) {
            return $this->error(
                'Payment has already been completed.',
                409
            );
        }
        $hasUnresolvedWebxpayAttempt = $existingPayment
            ? $existingPayment->attempts()
                ->where('gateway', 'webxpay')
                ->whereIn('status', [
                    PaymentAttemptStatus::PROCESSING->value,
                    PaymentAttemptStatus::PENDING->value,
                    PaymentAttemptStatus::UNKNOWN->value,
                ])
                ->exists()
            : false;

        if ($hasUnresolvedWebxpayAttempt) {
            return $this->error(
                'A WEBXPAY payment attempt is already awaiting confirmation.',
                409
            );
        }

        try {
            [$payment, $alreadyProcessed] = $this->createOrFetchPayment(
                $ride->id,
                'card'
            );

            if ($alreadyProcessed) {
                return $this->error(
                    'Payment has already been completed.',
                    409
                );
            }

            $creditAllocation = $this->reserveSelectedCredit(
                $request,
                $ride,
                $payment
            );

            $loyaltyAllocation = $this->reserveSelectedLoyaltyPoints(
                $request,
                $ride,
                $payment,
                $this->remainingAmount($payment, $creditAllocation)
            );

            $remainingAmount = $this->remainingAmount(
                $payment,
                $creditAllocation,
                $loyaltyAllocation
            );

            if (Money::isZero($remainingAmount)) {
                $payment = $this->completeCreditOnlyPayment(
                    $payment,
                    $creditAllocation,
                    $loyaltyAllocation
                );

                return $this->success(
                    [
                        'payment_id' => $payment->id,
                        'attempt_id' => null,
                        'amount' => '0.00',
                        'currency' => 'LKR',
                        'checkout_url' => null,
                        'expires_at' => null,
                    ],
                    'Payment completed using PickU credits.'
                );
            }

            $payment = $this->prepareCardRetry(
                $payment
            );

            $this->prepareCardAllocation(
                $payment,
                $remainingAmount
            );

            $expiresAt = now()->addMinutes(15);

            $attempt = $this->createCardAttempt(
                payment: $payment,
                amount: $remainingAmount,
                gateway: 'webxpay',
                expiresAt: $expiresAt
            );

            $signedCheckoutPath = URL::temporarySignedRoute(
                'webxpay.checkout',
                $expiresAt,
                [
                    'attempt' => $attempt->id,
                ],
                absolute: false
            );

            $checkoutUrl = rtrim(
                (string) config('app.url'),
                '/'
            ).'/'.ltrim(
                $signedCheckoutPath,
                '/'
            );

            return $this->success(
                [
                    'payment_id' => $payment->id,
                    'attempt_id' => $attempt->id,
                    'merchant_order_id' => $attempt->merchant_order_id,
                    'amount' => $attempt->amount,
                    'currency' => $attempt->currency,
                    'checkout_url' => $checkoutUrl,
                    'expires_at' => $attempt->expires_at?->toIso8601String(),
                ],
                'WEBXPAY checkout prepared.',
                201
            );
        } catch (DomainException $exception) {
            return $this->error(
                $exception->getMessage(),
                422
            );
        } catch (Throwable $exception) {
            Log::error('WEBXPAY checkout preparation failed.', [
                'ride_id' => $ride->id,
                'error' => $exception->getMessage(),
            ]);

            return $this->error(
                'WEBXPAY checkout preparation failed.',
                500
            );
        }
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
            $creditAllocation = null;
            $loyaltyAllocation = null;

            if (! $alreadyProcessed) {
                $creditAllocation = $this->reserveSelectedCredit(
                    $request,
                    $ride,
                    $payment
                );
                $loyaltyAllocation = $this->reserveSelectedLoyaltyPoints(
                    $request,
                    $ride,
                    $payment,
                    $this->remainingAmount($payment, $creditAllocation)
                );
            }
            $remainingAmount = $this->remainingAmount(
                $payment,
                $creditAllocation,
                $loyaltyAllocation
            );
            if (
                ($creditAllocation || $loyaltyAllocation)
                && Money::isZero($remainingAmount)
                && ! $alreadyProcessed
            ) {
                $payment = $this->completeCreditOnlyPayment(
                    $payment,
                    $creditAllocation,
                    $loyaltyAllocation
                );
            } elseif (
                $paymentMethod === 'cash'
                && ($ride->use_wallet_credit || $ride->use_loyalty_points)
                && ! $alreadyProcessed
            ) {
                $payment = $this->completeCashSplitPayment(
                    $payment,
                    $creditAllocation,
                    $loyaltyAllocation,
                    $remainingAmount
                );
            }

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

                $cardAllocation = $this->prepareCardAllocation(
                    $payment,
                    $remainingAmount
                );

                $attempt = $this->createCardAttempt(
                    $payment,
                    $remainingAmount
                );

                $payment = $this->captureCard(
                    $payment,
                    $attempt,
                    $creditAllocation,
                    $loyaltyAllocation,
                    $cardAllocation
                );
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
                'attempts' => fn ($query) => $query
                    ->orderByDesc('attempt_number'),
                'allocations' => fn ($query) => $query
                    ->orderBy('type'),
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

            $cashSettlesImmediately = $paymentMethod === 'cash'
                && ! $lockedRide->use_wallet_credit
                && ! $lockedRide->use_loyalty_points;

            $payment = Payment::create([
                'ride_id' => $lockedRide->id,
                'passenger_id' => $lockedRide->passenger_id,
                'payment_method' => $paymentMethod,
                'amount' => $amount,
                'transaction_id' => 'txn_'.bin2hex(random_bytes(16)),
                'payment_status' => $cashSettlesImmediately
                    ? PaymentStatus::COMPLETED->value
                    : PaymentStatus::PENDING->value,
                'paid_at' => $cashSettlesImmediately ? now() : null,
            ]);

            if ($cashSettlesImmediately) {
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
    private function createCardAttempt(
        Payment $payment,
        string $amount,
        ?string $gateway = null,
        ?DateTimeInterface $expiresAt = null
    ): PaymentAttempt {
        return DB::transaction(function () use (
            $payment,
            $amount,
            $gateway,
            $expiresAt
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if ($lockedPayment->payment_status === 'COMPLETED') {
                throw new DomainException('Payment has already been completed.');
            }

            $nextAttemptNumber = ((int) $lockedPayment->attempts()->max('attempt_number')) + 1;

            $attempt = $lockedPayment->attempts()->create([
                'attempt_number' => $nextAttemptNumber,
                'gateway' => $gateway ?? $this->gateway()->name(),
                'merchant_order_id' => sprintf(
                    'PKU-R%d-P%d-A%02d',
                    $lockedPayment->ride_id,
                    $lockedPayment->id,
                    $nextAttemptNumber
                ),
                'status' => PaymentAttemptStatus::PROCESSING->value,
                'amount' => $amount,
                'currency' => 'LKR',
                'started_at' => now(),
                'expires_at' => $expiresAt,
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

    private function reserveSelectedCredit(
        Request $request,
        Ride $ride,
        Payment $payment,
    ): ?PaymentAllocation {
        if (! $ride->use_wallet_credit) {
            return null;
        }

        $existing = $payment->allocations()
            ->where(
                'type',
                PaymentAllocation::TYPE_PICKU_CREDIT
            )
            ->first();

        if (
            $existing
            && in_array($existing->status, [
                PaymentAllocation::STATUS_RESERVED,
                PaymentAllocation::STATUS_COMPLETED,
            ], true)
        ) {
            return $existing;
        }

        $idempotencyKey = trim(
            (string) $request->header('Idempotency-Key')
        );

        return $this->credits->reserve(
            payment: $payment,
            amount: (string) $payment->amount,
            reference: sprintf(
                'ride:%d:payment:%d:%s',
                $ride->id,
                $payment->id,
                $idempotencyKey
            ),
        );
    }

    /**
     * $capAmount is what's left of the payment after any credit allocation
     * already reserved - loyalty points must not independently claim up to
     * the full payment amount when credit already covers part of it, or the
     * two allocations can together exceed what's owed (remainingAmount()
     * would then reject the payment outright rather than gracefully
     * splitting between the two balances).
     */
    private function reserveSelectedLoyaltyPoints(
        Request $request,
        Ride $ride,
        Payment $payment,
        string $capAmount,
    ): ?PaymentAllocation {
        if (! $ride->use_loyalty_points) {
            return null;
        }

        $existing = $payment->allocations()
            ->where(
                'type',
                PaymentAllocation::TYPE_LOYALTY_POINTS
            )
            ->first();

        if (
            $existing
            && in_array($existing->status, [
                PaymentAllocation::STATUS_RESERVED,
                PaymentAllocation::STATUS_COMPLETED,
            ], true)
        ) {
            return $existing;
        }

        if (Money::isZero($capAmount)) {
            return null;
        }

        $idempotencyKey = trim(
            (string) $request->header('Idempotency-Key')
        );

        return $this->loyaltyPoints->reserve(
            payment: $payment,
            amount: $capAmount,
            reference: sprintf(
                'ride:%d:payment:%d:loyalty:%s',
                $ride->id,
                $payment->id,
                $idempotencyKey
            ),
        );
    }

    private function remainingAmount(
        Payment $payment,
        ?PaymentAllocation $creditAllocation,
        ?PaymentAllocation $loyaltyAllocation = null,
    ): string {
        $creditAmount = $creditAllocation
            ? Money::of($creditAllocation->amount)
            : '0.00';

        $loyaltyAmount = $loyaltyAllocation
            ? Money::of($loyaltyAllocation->amount)
            : '0.00';

        $remaining = Money::sub(
            Money::sub(
                Money::of($payment->amount),
                $creditAmount
            ),
            $loyaltyAmount
        );

        if (Money::isNegative($remaining)) {
            throw new DomainException(
                'PickU credit and loyalty point allocations exceed the payment amount.'
            );
        }

        return $remaining;
    }

    private function prepareCardAllocation(
        Payment $payment,
        string $amount,
    ): PaymentAllocation {
        if (Money::isZero($amount)) {
            throw new DomainException(
                'A zero card remainder must not create a card attempt.'
            );
        }

        return DB::transaction(function () use (
            $payment,
            $amount,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $allocation = PaymentAllocation::query()
                ->where('payment_id', $lockedPayment->id)
                ->where('type', PaymentAllocation::TYPE_CARD)
                ->lockForUpdate()
                ->first();

            if (
                $allocation
                && $allocation->status
                === PaymentAllocation::STATUS_COMPLETED
            ) {
                return $allocation;
            }

            $attributes = [
                'amount' => $amount,
                'status' => PaymentAllocation::STATUS_RESERVED,
                'reserved_at' => now(),
                'completed_at' => null,
                'released_at' => null,
            ];

            if ($allocation) {
                $allocation->update($attributes);

                return $allocation->refresh();
            }

            return PaymentAllocation::create([
                'payment_id' => $lockedPayment->id,
                'type' => PaymentAllocation::TYPE_CARD,
                'reference' => sprintf(
                    'payment:%d:card',
                    $lockedPayment->id
                ),
                ...$attributes,
            ]);
        }, 3);
    }

    private function completeCashSplitPayment(
        Payment $payment,
        ?PaymentAllocation $creditAllocation,
        ?PaymentAllocation $loyaltyAllocation,
        string $cashAmount,
    ): Payment {
        return DB::transaction(function () use (
            $payment,
            $creditAllocation,
            $loyaltyAllocation,
            $cashAmount,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if (
                $lockedPayment->payment_status
                === PaymentStatus::COMPLETED->value
            ) {
                return $lockedPayment;
            }

            if (! Money::isZero($cashAmount)) {
                PaymentAllocation::query()->updateOrCreate(
                    [
                        'payment_id' => $lockedPayment->id,
                        'type' => PaymentAllocation::TYPE_CASH,
                    ],
                    [
                        'amount' => $cashAmount,
                        'status' => PaymentAllocation::STATUS_COMPLETED,
                        'reference' => sprintf(
                            'payment:%d:cash',
                            $lockedPayment->id
                        ),
                        'completed_at' => now(),
                        'released_at' => null,
                    ]
                );
            }

            if ($creditAllocation) {
                $this->credits->consume(
                    allocation: $creditAllocation,
                    reference: sprintf(
                        'payment:%d:cash',
                        $lockedPayment->id
                    ),
                );
            }

            if ($loyaltyAllocation) {
                $this->loyaltyPoints->consume(
                    allocation: $loyaltyAllocation,
                    reference: sprintf(
                        'payment:%d:cash',
                        $lockedPayment->id
                    ),
                );
            }

            $lockedPayment->update([
                'payment_status' => PaymentStatus::COMPLETED->value,
                'paid_at' => now(),
                'failure_reason' => null,
            ]);

            $this->settlement->settle(
                $lockedPayment->refresh()
            );

            return $lockedPayment->refresh();
        }, 3);
    }

    private function completeCreditOnlyPayment(
        Payment $payment,
        ?PaymentAllocation $creditAllocation,
        ?PaymentAllocation $loyaltyAllocation = null,
    ): Payment {
        return DB::transaction(function () use (
            $payment,
            $creditAllocation,
            $loyaltyAllocation,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            if (
                $lockedPayment->payment_status
                === PaymentStatus::COMPLETED->value
            ) {
                return $lockedPayment;
            }

            $consumedAmount = '0.00';

            if ($creditAllocation) {
                $completedCredit = $this->credits->consume(
                    allocation: $creditAllocation,
                    reference: sprintf(
                        'payment:%d:credit-only',
                        $lockedPayment->id
                    ),
                );

                $consumedAmount = Money::add(
                    $consumedAmount,
                    (string) $completedCredit->amount
                );
            }

            if ($loyaltyAllocation) {
                $completedLoyalty = $this->loyaltyPoints->consume(
                    allocation: $loyaltyAllocation,
                    reference: sprintf(
                        'payment:%d:credit-only',
                        $lockedPayment->id
                    ),
                );

                $consumedAmount = Money::add(
                    $consumedAmount,
                    (string) $completedLoyalty->amount
                );
            }

            $lockedPayment->update([
                'payment_status' => PaymentStatus::COMPLETED->value,
                'paid_at' => now(),
                'gateway' => null,
                'gateway_reference' => null,
                'failure_reason' => null,
            ]);

            PaymentEvent::create([
                'payment_id' => $lockedPayment->id,
                'payment_attempt_id' => null,
                'event_type' => 'PAYMENT_COMPLETED',
                'source' => 'backend',
                'metadata' => [
                    'amount' => $consumedAmount,
                    'currency' => 'LKR',
                    'payment_source' => $creditAllocation && $loyaltyAllocation
                        ? 'PICKU_CREDIT_AND_LOYALTY_POINTS'
                        : ($loyaltyAllocation ? 'LOYALTY_POINTS' : 'PICKU_CREDIT'),
                ],
            ]);

            $this->settlement->settle(
                $lockedPayment->refresh()
            );

            return $lockedPayment->refresh();
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
        PaymentAttempt $attempt,
        ?PaymentAllocation $creditAllocation,
        ?PaymentAllocation $loyaltyAllocation,
        PaymentAllocation $cardAllocation,
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

        return DB::transaction(function () use (
            $payment,
            $attempt,
            $result,
            $creditAllocation,
            $loyaltyAllocation,
            $cardAllocation,
        ) {
            $lockedPayment = Payment::query()
                ->lockForUpdate()
                ->findOrFail($payment->id);

            $lockedAttempt = PaymentAttempt::query()
                ->lockForUpdate()
                ->findOrFail($attempt->id);

            $lockedCardAllocation = PaymentAllocation::query()
                ->lockForUpdate()
                ->findOrFail($cardAllocation->id);

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
                    'event_type' => 'PAYMENT_'.$result->status->value,
                    'source' => 'gateway',
                    'provider_reference' => $result->reference,
                    'metadata' => [
                        'reason' => $result->failureReason,
                    ],
                ]);

                $definiteFailure = in_array($result->status, [
                    PaymentAttemptStatus::DECLINED,
                    PaymentAttemptStatus::FAILED,
                    PaymentAttemptStatus::CANCELLED,
                ], true);

                if ($definiteFailure) {
                    $lockedCardAllocation->update([
                        'status' => PaymentAllocation::STATUS_RELEASED,
                        'released_at' => now(),
                    ]);

                    if ($creditAllocation) {
                        $this->credits->release(
                            allocation: $creditAllocation,
                            reference: sprintf(
                                'attempt:%d',
                                $lockedAttempt->id
                            ),
                        );
                    }

                    if ($loyaltyAllocation) {
                        $this->loyaltyPoints->release(
                            allocation: $loyaltyAllocation,
                            reference: sprintf(
                                'attempt:%d',
                                $lockedAttempt->id
                            ),
                        );
                    }
                }

                return $lockedPayment->refresh();
            }

            $lockedAttempt->update([
                'status' => PaymentAttemptStatus::COMPLETED->value,
                'gateway_reference' => $result->reference,
                'completed_at' => now(),
                'failure_reason' => null,
            ]);
            $lockedCardAllocation->update([
                'status' => PaymentAllocation::STATUS_COMPLETED,
                'completed_at' => now(),
                'released_at' => null,
            ]);

            if ($creditAllocation) {
                $this->credits->consume(
                    allocation: $creditAllocation,
                    reference: sprintf(
                        'attempt:%d',
                        $lockedAttempt->id
                    ),
                );
            }

            if ($loyaltyAllocation) {
                $this->loyaltyPoints->consume(
                    allocation: $loyaltyAllocation,
                    reference: sprintf(
                        'attempt:%d',
                        $lockedAttempt->id
                    ),
                );
            }

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
                    'amount' => $lockedAttempt->amount,
                    'currency' => 'LKR',
                ],
            ]);

            $this->settlement->settle($lockedPayment->refresh());

            return $lockedPayment->refresh();
        }, 3);
    }
}
