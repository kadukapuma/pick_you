<?php

namespace App\Http\Controllers;

use App\Models\WebxpayTokenizationOperation;
use App\Services\Payments\WebxpayTokenizationCallbackProcessor;
use App\Services\Payments\WebxpayTokenizationSessionProcessor;
use DomainException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class WebxpayTokenizationPageController extends Controller
{
    public function show(
        WebxpayTokenizationOperation $operation
    ): Response {
        if (! config('payments.webxpay.tokenization.enabled')) {
            abort(503, 'WEBXPAY saved cards are currently unavailable.');
        }

        if ($operation->isExpired()) {
            abort(410, 'WEBXPAY card setup has expired.');
        }

        if (! $operation->canAcceptSession()) {
            abort(409, 'WEBXPAY card setup is no longer available.');
        }

        return response()->view(
            'payments.webxpay-tokenization-setup',
            [
                'sessionScriptUrl' => $this->sessionScriptUrl(),
                'sessionSubmitUrl' => URL::temporarySignedRoute(
                    'webxpay.tokenization.session',
                    $operation->expires_at,
                    ['operation' => $operation->id],
                    absolute: false
                ),
            ]
        );
    }

    public function storeSession(
        Request $request,
        WebxpayTokenizationOperation $operation,
        WebxpayTokenizationSessionProcessor $processor
    ): JsonResponse {
        if (! config('payments.webxpay.tokenization.enabled')) {
            return response()->json([
                'status' => 'error',
                'message' => 'WEBXPAY saved cards are currently unavailable.',
            ], 503);
        }

        $validated = $request->validate([
            'session' => ['required', 'string', 'regex:/^SESSION[A-Za-z0-9]+$/'],
            'address_line_one' => ['required', 'string', 'max:255'],
            'city' => ['required', 'string', 'max:100'],
            'postal_code' => ['required', 'string', 'max:20'],
            'country' => ['required', 'string', 'max:100'],
        ]);

        try {
            $result = $processor->process(
                operation: $operation,
                sessionId: $validated['session'],
                billing: $validated
            );
        } catch (DomainException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 409);
        } catch (\Throwable $exception) {
            if ($operation->fresh()?->status === WebxpayTokenizationOperation::STATUS_PROCESSING) {
                $operation->fresh()->markFailed(
                    'PROVIDER_ERROR',
                    'Card setup could not be completed.'
                );
            }

            Log::error('WEBXPAY hosted session submission failed.', [
                'operation_id' => $operation->id,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'Card setup could not be completed. Please try again.',
            ], 502);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'operation_id' => $operation->id,
                'operation_status' => $operation->fresh()->status,
                'requires_3ds' => $result->requiresThreeDs(),
                'three_ds_url' => $result->threeDsUrl,
            ],
        ]);
    }

    public function handleReturn(
        Request $request,
        WebxpayTokenizationOperation $operation,
        WebxpayTokenizationCallbackProcessor $processor
    ): RedirectResponse|JsonResponse {
        $validated = $request->validate([
            'token' => ['required', 'string', 'size:64'],
            'result3ds' => ['required', 'string', 'max:16384'],
        ]);

        try {
            $status = $processor->process(
                operation: $operation,
                callbackToken: $validated['token'],
                encodedResult: $validated['result3ds']
            );
        } catch (DomainException $exception) {
            return response()->json([
                'status' => 'error',
                'message' => $exception->getMessage(),
            ], 403);
        } catch (\Throwable $exception) {
            Log::error('WEBXPAY tokenization callback failed.', [
                'operation_id' => $operation->id,
                'exception' => $exception::class,
            ]);

            return response()->json([
                'status' => 'error',
                'message' => 'WEBXPAY tokenization callback could not be processed.',
            ], 400);
        }

        return redirect()->away(
            $this->appResultUrl($operation, $status)
        );
    }

    private function appResultUrl(
        WebxpayTokenizationOperation $operation,
        string $status
    ): string {
        $baseUrl = (string) config(
            'payments.webxpay.tokenization.app_result_url'
        );

        if (
            parse_url($baseUrl, PHP_URL_SCHEME) !== 'picku'
            || parse_url($baseUrl, PHP_URL_HOST) !== 'payments'
            || parse_url($baseUrl, PHP_URL_PATH) !== '/card-result'
        ) {
            throw new RuntimeException(
                'WEBXPAY tokenization app result URL is invalid.'
            );
        }

        return $baseUrl.'?'.http_build_query([
            'operation_id' => $operation->id,
            'status' => $status,
        ], encoding_type: PHP_QUERY_RFC3986);
    }

    private function sessionScriptUrl(): string
    {
        $baseUrl = rtrim((string) config(
            'payments.webxpay.tokenization.hosted_session_script_base_url'
        ), '/');
        $version = (string) config(
            'payments.webxpay.tokenization.hosted_session_version'
        );
        $bankMid = (string) config(
            'payments.webxpay.tokenization.bank_mid'
        );

        if (
            filter_var($baseUrl, FILTER_VALIDATE_URL) === false
            || parse_url($baseUrl, PHP_URL_SCHEME) !== 'https'
            || preg_match('/^[0-9]+$/', $version) !== 1
            || preg_match('/^[A-Za-z0-9_-]+$/', $bankMid) !== 1
        ) {
            throw new RuntimeException(
                'WEBXPAY hosted session configuration is invalid.'
            );
        }

        return $baseUrl.'/version/'.$version
            .'/merchant/'.$bankMid.'/session.js';
    }
}
