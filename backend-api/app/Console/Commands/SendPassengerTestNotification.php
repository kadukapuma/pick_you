<?php

namespace App\Console\Commands;

use App\Models\DeviceToken;
use App\Models\Passenger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class SendPassengerTestNotification extends Command
{
    protected $signature = 'notifications:test-passenger {passenger_id} {--title=Passenger Test} {--body=Testing Passenger App Notifications!}';

    protected $description = 'Send a test push notification synchronously to a passenger app by passenger_id.';

    public function handle(): int
    {
        $passengerId = $this->argument('passenger_id');
        $passenger = Passenger::with('user')->find($passengerId);

        if (!$passenger) {
            $this->error("Passenger with ID {$passengerId} not found.");
            return self::FAILURE;
        }

        $user = $passenger->user;

        if (!$user) {
            $this->error("No user account associated with Passenger ID {$passengerId}.");
            return self::FAILURE;
        }

        $tokens = DeviceToken::where('user_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->get();

        if ($tokens->isEmpty()) {
            $this->error("No device tokens registered for Passenger ID {$passengerId} (User ID {$user->id}).");
            return self::FAILURE;
        }

        // If there are multiple tokens, keep only the latest one to prevent developer account conflicts
        if ($tokens->count() > 1) {
            $this->info("Found multiple registered tokens. Cleaning up older tokens to prevent developer account conflicts...");
            $latestToken = $tokens->first();
            DeviceToken::where('user_id', $user->id)
                ->where('id', '!=', $latestToken->id)
                ->delete();
            $tokens = collect([$latestToken]);
        }

        $this->info("Sending push notification to the latest device for passenger: " . trim(($user->first_name ?? 'Passenger') . ' ' . ($user->last_name ?? '')));

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
