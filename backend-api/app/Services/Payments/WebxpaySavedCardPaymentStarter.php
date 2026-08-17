<?php

namespace App\Services\Payments;

use App\Enums\PaymentAttemptStatus;
use App\Models\Passenger;
use App\Models\PassengerPaymentMethod;
use App\Models\Payment;
use App\Models\PaymentAttempt;
use App\Models\WebxpayTokenPaymentOperation;
use DomainException;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class WebxpaySavedCardPaymentStarter
{
    public function __construct(
        private readonly WebxpayTokenizationClient $client,
        private readonly WebxpaySavedCardSynchronizer $synchronizer,
        private readonly WebxpayOutcomeProcessor $outcomeProcessor
    ) {}

    /**
     * @return array{
     *     operation: WebxpayTokenPaymentOperation,
     *     payment: Payment,
     *     three_ds_url: string|null
     * }
     */
    public function start(
        Passenger $passenger,
        PaymentAttempt $attempt,
        PassengerPaymentMethod $method,
        string $callbackBaseUrl
    ): array {
        [$operation, $callbackToken, $email] = DB::transaction(
            function () use ($passenger, $attempt, $method) {
                $lockedAttempt = PaymentAttempt::query()
                    ->with('payment')
                    ->lockForUpdate()
                    ->findOrFail($attempt->id);
                $lockedMethod = PassengerPaymentMethod::query()
                    ->lockForUpdate()
                    ->findOrFail($method->id);

                if ($lockedAttempt->payment->passenger_id !== $passenger->id) {
                    throw new DomainException(
                        'WEBXPAY payment attempt does not belong to this passenger.'
                    );
                }

                if ($lockedMethod->passenger_id !== $passenger->id
                    || $lockedMethod->gateway !== 'webxpay'
                ) {
                    throw new DomainException(
                        'WEBXPAY saved card does not belong to this passenger.'
                    );
                }

                if ($lockedMethod->isExpired()) {
                    throw new DomainException('The selected saved card has expired.');
                }

                if ($lockedAttempt->gateway !== 'webxpay'
                    || $lockedAttempt->status !== PaymentAttemptStatus::PROCESSING->value
                    || ($lockedAttempt->expires_at && $lockedAttempt->expires_at->isPast())
                ) {
                    throw new DomainException(
                        'WEBXPAY payment attempt is no longer available.'
                    );
                }

                if (WebxpayTokenPaymentOperation::query()
                    ->where('payment_attempt_id', $lockedAttempt->id)
                    ->exists()
                ) {
                    throw new DomainException(
                        'WEBXPAY saved-card payment has already been started.'
                    );
                }

                $passenger->loadMissing('user');
                $email = (string) $passenger->user?->email;

                if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
                    throw new RuntimeException(
                        'Passenger must have a valid email for WEBXPAY payment.'
                    );
                }

                $callbackToken = bin2hex(random_bytes(32));
                $operation = WebxpayTokenPaymentOperation::create([
                    'passenger_id' => $passenger->id,
                    'passenger_payment_method_id' => $lockedMethod->id,
                    'payment_attempt_id' => $lockedAttempt->id,
                    'customer_id' => $this->synchronizer->customerId($passenger),
                    'customer_email' => $email,
                    'callback_token_hash' => hash('sha256', $callbackToken),
                    'status' => WebxpayTokenPaymentOperation::STATUS_PROCESSING,
                    'expires_at' => $lockedAttempt->expires_at ?? now()->addMinutes(15),
                ]);

                return [$operation, $callbackToken, $email];
            },
            3
        );

        $callbackUrl = $this->callbackUrl($callbackBaseUrl, $callbackToken);
        $result = $this->client->payWithToken(
            cardId: (string) $method->getRawOriginal('token'),
            amount: (string) $attempt->amount,
            orderNumber: $attempt->merchant_order_id,
            bankMid: (string) config('payments.webxpay.tokenization.bank_mid'),
            threeDsResponseUrl: $callbackUrl,
            customerId: $operation->customer_id,
            customerEmail: $email
        );

        if ($result->requiresThreeDs()) {
            $operation->markThreeDsRequired();

            return [
                'operation' => $operation->fresh(),
                'payment' => $attempt->payment()->firstOrFail(),
                'three_ds_url' => $result->threeDsUrl,
            ];
        }

        $payment = $this->outcomeProcessor->process($attempt, [
            'merchant_order_id' => $attempt->merchant_order_id,
            'provider_reference' => (string) $result->gatewayReference,
            'transaction_time' => now()->format('Y-m-d H:i:s'),
            'status_code' => '00',
            'comment' => '00 - Approved',
            'gateway' => (string) config('payments.webxpay.response_gateway_id'),
            'transaction_amount' => (string) $attempt->amount,
            'requested_amount' => (string) $attempt->amount,
        ]);
        $operation->markCompleted();

        return [
            'operation' => $operation->fresh(),
            'payment' => $payment,
            'three_ds_url' => null,
        ];
    }

    private function callbackUrl(string $baseUrl, string $token): string
    {
        if (filter_var($baseUrl, FILTER_VALIDATE_URL) === false
            || parse_url($baseUrl, PHP_URL_SCHEME) !== 'https'
        ) {
            throw new RuntimeException(
                'WEBXPAY saved-card callback URL must be a valid HTTPS URL.'
            );
        }

        return $baseUrl.(str_contains($baseUrl, '?') ? '&' : '?')
            .http_build_query(['token' => $token], encoding_type: PHP_QUERY_RFC3986);
    }
}
