<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Models\PaymentAttempt;
use App\Models\Ride;
use App\Services\Payments\WebxpaySavedCardPaymentStarter;
use App\Traits\ApiResponse;
use DomainException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class WebxpaySavedCardPaymentController extends Controller
{
    use ApiResponse;

    public function store(
        Request $request,
        Ride $ride,
        PaymentAttempt $attempt,
        WebxpaySavedCardPaymentStarter $starter
    ) {
        if (! config('payments.webxpay.enabled')
            || ! config('payments.webxpay.tokenization.enabled')
        ) {
            return $this->error(
                'WEBXPAY saved-card payments are unavailable.',
                503
            );
        }

        if ($request->user()->cannot('processPayment', $ride)) {
            return $this->error(
                'You are not authorized to pay for this ride.',
                403
            );
        }

        $validated = $request->validate([
            'payment_method_id' => ['required', 'integer', 'min:1'],
        ]);
        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found.', 404);
        }

        $attemptBelongsToRide = PaymentAttempt::query()
            ->whereKey($attempt->id)
            ->whereHas('payment', fn ($query) => $query
                ->where('ride_id', $ride->id)
                ->where('passenger_id', $passenger->id))
            ->exists();

        if (! $attemptBelongsToRide) {
            return $this->error('WEBXPAY payment attempt not found.', 404);
        }

        $method = PassengerPaymentMethod::query()
            ->whereKey($validated['payment_method_id'])
            ->where('passenger_id', $passenger->id)
            ->where('gateway', 'webxpay')
            ->first();

        if (! $method) {
            return $this->error('WEBXPAY payment method not found.', 404);
        }

        try {
            $result = $starter->start(
                passenger: $passenger,
                attempt: $attempt,
                method: $method,
                callbackBaseUrl: rtrim(
                    (string) config('app.url'),
                    '/'
                ).'/payments/webxpay/token/'.$attempt->id.'/return'
            );
        } catch (DomainException $exception) {
            return $this->error($exception->getMessage(), 409);
        } catch (Throwable $exception) {
            Log::error('WEBXPAY saved-card payment start failed.', [
                'ride_id' => $ride->id,
                'attempt_id' => $attempt->id,
                'passenger_id' => $passenger->id,
                'exception' => $exception::class,
            ]);

            return $this->error(
                'Saved-card payment could not be started. Please try again.',
                502
            );
        }

        $requiresThreeDs = $result['three_ds_url'] !== null;

        return $this->success([
            'ride_id' => $ride->id,
            'payment_id' => $result['payment']->id,
            'attempt_id' => $attempt->id,
            'operation_id' => $result['operation']->id,
            'payment_status' => $result['payment']->payment_status,
            'requires_3ds' => $requiresThreeDs,
            'three_ds_url' => $result['three_ds_url'],
        ], $requiresThreeDs
            ? 'WEBXPAY card authentication is required.'
            : 'WEBXPAY saved-card payment completed.',
            $requiresThreeDs ? 201 : 200
        );
    }
}
