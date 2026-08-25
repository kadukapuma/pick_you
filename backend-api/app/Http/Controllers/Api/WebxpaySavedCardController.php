<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PassengerPaymentMethod;
use App\Services\Payments\WebxpaySavedCardRemover;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Services\Payments\WebxpayTokenizationSetup;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;  

class WebxpaySavedCardController extends Controller
{
    use ApiResponse;

    public function storeSetup(Request $request)
    {
        if (! config('payments.webxpay.tokenization.enabled')) {
            return $this->error(
                'WEBXPAY saved cards are unavailable.',
                503
            );
        }

        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        try {
            $setup = app(WebxpayTokenizationSetup::class)
                ->create($passenger);
        } catch (Throwable $exception) {
            Log::error('WEBXPAY card setup preparation failed.', [
                'passenger_id' => $passenger->id,
                'exception' => $exception::class,
            ]);

            return $this->error(
                'Card setup is temporarily unavailable. Please try again shortly.',
                503
            );
        }

        return $this->success([
            'operation_id' => $setup['operation']->id,
            'setup_url' => $setup['setup_url'],
            'expires_at' => $setup['operation']->expires_at
                ->toIso8601String(),
        ], 'WEBXPAY card setup prepared.', 201);
    }

    public function index(Request $request)
    {
        if (! config('payments.webxpay.tokenization.enabled')) {
            return $this->error(
                'WEBXPAY saved cards are unavailable.',
                503
            );
        }

        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        try {
            $methods = app(WebxpaySavedCardSynchronizer::class)
                ->sync($passenger);
        } catch (Throwable $exception) {
            Log::error('WEBXPAY saved card synchronization failed.', [
                'passenger_id' => $passenger->id,
                'exception' => $exception::class,
                'message' => $exception->getMessage(),
            ]);

            return $this->error(
                'Saved cards are temporarily unavailable. Please try again shortly.',
                503
            );
        }

        return $this->success(
            $methods,
            'WEBXPAY saved cards retrieved successfully.'
        );
    }

    public function destroy(Request $request, int $paymentMethod)
    {
        if (! config('payments.webxpay.tokenization.enabled')) {
            return $this->error(
                'WEBXPAY saved cards are unavailable.',
                503
            );
        }

        $passenger = $request->user()->passenger;

        if (! $passenger) {
            return $this->error('Passenger not found', 404);
        }

        $method = PassengerPaymentMethod::query()
            ->where('passenger_id', $passenger->id)
            ->where('gateway', 'webxpay')
            ->find($paymentMethod);

        if (! $method) {
            return $this->error('WEBXPAY payment method not found.', 404);
        }

        try {
            app(WebxpaySavedCardRemover::class)
                ->remove($passenger, $method);
        } catch (Throwable $exception) {
            Log::error('WEBXPAY saved card removal failed.', [
                'passenger_id' => $passenger->id,
                'payment_method_id' => $method->id,
                'exception' => $exception::class,
            ]);

            return $this->error(
                'Card could not be removed. Please try again shortly.',
                503
            );
        }

        return $this->success(
            null,
            'WEBXPAY payment method removed successfully.'
        );
    }
}
