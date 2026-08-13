<?php

namespace App\Http\Controllers;

use App\Models\PaymentAttempt;
use App\Models\WebxpayTokenPaymentOperation;
use App\Services\Payments\WebxpayAppResultUrl;
use App\Services\Payments\WebxpayTokenPaymentCallbackProcessor;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class WebxpayTokenPaymentReturnController extends Controller
{
    public function __construct(
        private readonly WebxpayTokenPaymentCallbackProcessor $processor,
        private readonly WebxpayAppResultUrl $appResultUrl
    ) {}

    public function handle(
        Request $request,
        PaymentAttempt $attempt
    ): RedirectResponse|JsonResponse {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'result3ds' => ['required', 'string', 'max:16384'],
        ]);
        $operation = WebxpayTokenPaymentOperation::query()
            ->where('payment_attempt_id', $attempt->id)
            ->first();

        if (! $operation) {
            return response()->json([
                'status' => 'error',
                'message' => 'WEBXPAY saved-card operation was not found.',
            ], 404);
        }

        try {
            $payment = $this->processor->process(
                operation: $operation,
                callbackToken: $validated['token'],
                encodedResult: $validated['result3ds']
            );
        } catch (DomainException $exception) {
            Log::warning('WEBXPAY saved-card callback rejected.', [
                'attempt_id' => $attempt->id,
                'operation_id' => $operation->id,
                'reason' => $exception->getMessage(),
            ]);

            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        } catch (Throwable $exception) {
            Log::error('WEBXPAY saved-card callback failed.', [
                'attempt_id' => $attempt->id,
                'operation_id' => $operation->id,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'WEBXPAY saved-card callback could not be processed.',
            ], 400);
        }

        return redirect()->away(
            $this->appResultUrl->forPayment(
                rideId: (int) $payment->ride_id,
                paymentId: (int) $payment->id,
                status: (string) $payment->payment_status
            )
        );
    }
}
