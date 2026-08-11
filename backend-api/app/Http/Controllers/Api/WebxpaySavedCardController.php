<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payments\WebxpaySavedCardSynchronizer;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class WebxpaySavedCardController extends Controller
{
    use ApiResponse;

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
}
