<?php

namespace App\Services\Auth;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotifySmsSender
{
    public function send(string $to, string $message): bool
    {
        $credentials = config('services.notifylk');
        if (blank($credentials['user_id'] ?? null)
            || blank($credentials['api_key'] ?? null)
            || blank($credentials['sender_id'] ?? null)) {
            Log::error('Notify.lk credentials are not configured.');

            return false;
        }

        try {
            $response = Http::timeout(15)->get($credentials['url'], [
                'user_id' => $credentials['user_id'],
                'api_key' => $credentials['api_key'],
                'sender_id' => $credentials['sender_id'],
                'to' => $to,
                'message' => $message,
            ]);
        } catch (ConnectionException $exception) {
            Log::error('Notify.lk connection failed.', ['message' => $exception->getMessage()]);

            return false;
        }

        if (! $response->successful()) {
            Log::error('Notify.lk rejected an SMS request.', [
                'status' => $response->status(),
                'response' => $response->body(),
                'recipient_suffix' => substr($to, -4),
            ]);

            return false;
        }

        return true;
    }
}
