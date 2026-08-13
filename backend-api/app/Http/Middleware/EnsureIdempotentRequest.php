<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyRecord;
use App\Services\Idempotency\RequestFingerprint;
use Closure;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class EnsureIdempotentRequest
{
    public function __construct(private readonly RequestFingerprint $fingerprint) {}

    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key'));
        if (! preg_match('/^[A-Za-z0-9._:-]{8,128}$/', $key)) {
            return response()->json(['status' => 'error', 'message' => 'A valid Idempotency-Key header is required.'], 422);
        }

        $hash = $this->fingerprint->make($request);
        $record = $this->claim($request->user()->id, $key, $hash);

        if ($record->request_hash !== $hash) {
            return response()->json(['status' => 'error', 'message' => 'This Idempotency-Key was already used for a different request.'], 422);
        }
        if ($record->status === 'COMPLETED') {
            return response()->json($record->response_body, $record->response_status);
        }
        if (! $record->wasRecentlyCreated) {
            return response()->json(['status' => 'error', 'message' => 'An identical request is already being processed.'], 409);
        }

        try {
            $response = $next($request);
        } catch (Throwable $exception) {
            $record->delete();
            throw $exception;
        }

        if ($response instanceof JsonResponse
            && $response->getStatusCode() < 500
            && $response->getStatusCode() !== 429
        ) {
            $record->update([
                'status' => 'COMPLETED',
                'response_status' => $response->getStatusCode(),
                'response_body' => $response->getData(true),
                'expires_at' => now()->addDay(),
            ]);
        } else {
            $record->delete();
        }

        return $response;
    }

    private function claim(int $userId, string $key, string $hash): IdempotencyRecord
    {
        try {
            return IdempotencyRecord::create([
                'user_id' => $userId,
                'key' => $key,
                'request_hash' => $hash,
                'status' => 'PROCESSING',
                'expires_at' => now()->addMinutes(5),
            ]);
        } catch (UniqueConstraintViolationException) {
            $record = IdempotencyRecord::where('user_id', $userId)->where('key', $key)->firstOrFail();

            if ($record->expires_at->isPast()) {
                $record->delete();

                return $this->claim($userId, $key, $hash);
            }

            return $record;
        }
    }
}
