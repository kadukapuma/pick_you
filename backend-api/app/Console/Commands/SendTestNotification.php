<?php

namespace App\Console\Commands;

use App\Models\DeviceToken;
use App\Models\User;
use App\Services\Notifications\ExpoPushService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SendTestNotification extends Command
{
    protected $signature = 'notifications:test {user_id} {--title=Test Notification} {--body=Hello World from Artisan Command!}';

    protected $description = 'Send a test push notification synchronously to a user for diagnostics.';

    public function handle(ExpoPushService $expoPush): int
    {
        $userId = $this->argument('user_id');
        $user = User::find($userId);

        if (!$user) {
            $this->error("User with ID {$userId} not found.");
            return self::FAILURE;
        }

        $tokens = DeviceToken::where('user_id', $userId)
            ->orderBy('updated_at', 'desc')
            ->get();

        if ($tokens->isEmpty()) {
            $this->error("No device tokens registered for user ID {$userId}.");
            return self::FAILURE;
        }

        // If there are multiple tokens, keep only the latest one to prevent developer account conflicts
        if ($tokens->count() > 1) {
            $this->info("Found multiple registered tokens. Cleaning up older tokens to prevent developer account conflicts...");
            $latestToken = $tokens->first();
            DeviceToken::where('user_id', $userId)
                ->where('id', '!=', $latestToken->id)
                ->delete();
            $tokens = collect([$latestToken]);
        }

        $this->info("Sending push notification to the latest device for user: " . trim(($user->first_name ?? 'User') . ' ' . ($user->last_name ?? '')));

        $messages = $tokens->map(fn ($token) => [
            'to' => $token->token,
            'title' => $this->option('title'),
            'body' => $this->option('body'),
            'sound' => 'default',
            'priority' => 'high',
        ])->values()->all();

        $headers = ['Content-Type' => 'application/json', 'Accept' => 'application/json'];
        if ($accessToken = config('services.expo.access_token')) {
            $headers['Authorization'] = "Bearer {$accessToken}";
        }

        try {
            $response = Http::withHeaders($headers)->post('https://exp.host/--/api/v2/push/send', $messages);

            $this->info("HTTP Status: " . $response->status());
            
            $result = $response->json();
            $this->line("Response:");
            $this->line(json_encode($result, JSON_PRETTY_PRINT));

            return self::SUCCESS;
        } catch (\Throwable $e) {
            $this->error("Exception: " . $e->getMessage());
            return self::FAILURE;
        }
    }
}
