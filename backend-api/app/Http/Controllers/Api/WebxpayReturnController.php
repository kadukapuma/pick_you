<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentAttempt;
use App\Services\Payments\WebxpayResponseParser;
use App\Services\Payments\WebxpayResponseVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class WebxpayReturnController extends Controller
{
    public function __construct(
        private readonly WebxpayResponseVerifier $verifier,
        private readonly WebxpayResponseParser $parser
    ) {}

    public function handle(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'payment' => [
                'required',
                'string',
            ],
            'signature' => [
                'required',
                'string',
            ],
            'custom_fields' => [
                'nullable',
                'string',
            ],
        ]);

        try {
            $verified = $this->verifier->verify(
                payment: $validated['payment'],
                signature: $validated['signature'],
                customFields: $validated['custom_fields']
                    ?? null
            );

            $parsed = $this->parser->parse(
                $verified['payment']
            );
        } catch (RuntimeException) {
            Log::warning(
                'Invalid WEBXPAY return response rejected.'
            );

            return response()->json([
                'status' => 'error',
                'message' => 'Invalid WEBXPAY response.',
            ], 400);
        }

        $attempt = PaymentAttempt::query()
            ->where(
                'merchant_order_id',
                $parsed['merchant_order_id']
            )
            ->where('gateway', 'webxpay')
            ->first();

        if (! $attempt) {
            return response()->json([
                'status' => 'error',
                'message' => 'WEBXPAY payment attempt was not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'WEBXPAY return processing is not implemented.',
        ], 501);
    }
}
