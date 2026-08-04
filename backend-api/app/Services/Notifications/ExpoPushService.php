<?php

namespace App\Services\Notifications;

use App\Models\DeviceToken;
use App\Models\PushTicket;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const PUSH_URL = 'https://exp.host/--/api/v2/push/send';

    private const CHUNK_SIZE = 100;

    /**
     * Send a push message to every device token for a user.
     * Expo caps requests at 100 messages, so tokens are sent in chunks.
     */
    public function sendToTokens(iterable $deviceTokens, string $title, string $body, array $data = []): void
    {
        $tokens = collect($deviceTokens)->filter(fn (DeviceToken $token) => str_starts_with($token->token, 'ExponentPushToken'));

        if ($tokens->isEmpty()) {
            return;
        }

        foreach ($tokens->chunk(self::CHUNK_SIZE) as $chunk) {
            $this->sendChunk($chunk, $title, $body, $data);
        }
    }

    private function sendChunk($chunk, string $title, string $body, array $data): void
    {
        $messages = $chunk->map(fn (DeviceToken $token) => [
            'to' => $token->token,
            'title' => $title,
            'body' => $body,
            'data' => $data,
            'sound' => 'default',
            'priority' => 'high',
        ])->values()->all();

        $headers = ['Content-Type' => 'application/json', 'Accept' => 'application/json'];
        if ($accessToken = config('services.expo.access_token')) {
            $headers['Authorization'] = "Bearer {$accessToken}";
        }

        try {
            $response = Http::withHeaders($headers)->post(self::PUSH_URL, $messages);

            if (! $response->successful()) {
                Log::warning('Expo push send failed.', ['status' => $response->status(), 'body' => $response->body()]);

                return;
            }

            $tickets = collect($response->json('data', []));

            foreach ($tickets as $index => $ticket) {
                $deviceToken = $chunk->values()->get($index);
                if (! $deviceToken) {
                    continue;
                }

                if (($ticket['status'] ?? null) === 'ok' && isset($ticket['id'])) {
                    PushTicket::create([
                        'device_token_id' => $deviceToken->id,
                        'ticket_id' => $ticket['id'],
                    ]);
                } elseif (($ticket['details']['error'] ?? null) === 'DeviceNotRegistered') {
                    $deviceToken->delete();
                }
            }
        } catch (\Throwable $exception) {
            Log::warning('Expo push send threw an exception.', ['error' => $exception->getMessage()]);
        }
    }
}
