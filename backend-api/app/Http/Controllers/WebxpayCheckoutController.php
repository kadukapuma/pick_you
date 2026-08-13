<?php

namespace App\Http\Controllers;

use App\Models\PaymentAttempt;
use App\Services\Payments\WebxpayCheckoutRequest;
use Symfony\Component\HttpFoundation\Response;

class WebxpayCheckoutController extends Controller
{
    public function __construct(
        private readonly WebxpayCheckoutRequest $checkoutRequest
    ) {}

    public function show(
        PaymentAttempt $attempt
    ): Response {
        if (! config('payments.webxpay.enabled')) {
            abort(
                503,
                'WEBXPAY checkout is currently unavailable.'
            );
        }

        if ($attempt->gateway !== 'webxpay') {
            abort(404);
        }

        if ($attempt->status !== 'PROCESSING') {
            abort(
                409,
                'WEBXPAY checkout is no longer available.'
            );
        }

        if (
            $attempt->expires_at === null
            || $attempt->expires_at->isPast()
        ) {
            abort(
                410,
                'WEBXPAY checkout has expired.'
            );
        }

        $attempt->load([
            'payment.ride',
            'payment.passenger.user',
        ]);

        $payment = $attempt->payment;
        $ride = $payment->ride;
        $user = $payment->passenger->user;

        $fields = $this->checkoutRequest->build(
            customer: [
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'contact_number' => $user->phone_normalized
                    ?: $user->phone,
                'address_line_one' => $ride->pickup_address,
                'address_line_two' => '',
                'city' => '',
                'state' => '',
                'postal_code' => '',
                'country' => 'Sri Lanka',
            ],
            merchantOrderId: $attempt->merchant_order_id,
            amount: $attempt->amount,
            customFields: [
                "attempt-{$attempt->id}",
                "ride-{$ride->id}",
            ]
        );

        return response()->view(
            'payments.webxpay-checkout',
            [
                'checkoutUrl' => config(
                    'payments.webxpay.checkout_url'
                ),
                'fields' => $fields,
            ]
        );
    }
}
