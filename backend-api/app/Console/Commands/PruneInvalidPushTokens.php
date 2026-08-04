<?php

namespace App\Console\Commands;

use App\Models\PushTicket;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PruneInvalidPushTokens extends Command
{
    protected $signature = 'notifications:prune-invalid-tokens';

    protected $description = 'Check Expo push receipts and remove device tokens that are no longer registered.';

    private const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

    private const CHUNK_SIZE = 1000;

    public function handle(): int
    {
        // Expo receipts aren't available immediately; only check tickets old enough to have one.
        $tickets = PushTicket::whereNull('checked_at')
            ->where('created_at', '<', now()->subMinutes(15))
            ->with('deviceToken')
            ->limit(5000)
            ->get();

        if ($tickets->isEmpty()) {
            $this->info('No push tickets to check.');

            return self::SUCCESS;
        }

        $headers = ['Content-Type' => 'application/json', 'Accept' => 'application/json'];
        if ($accessToken = config('services.expo.access_token')) {
            $headers['Authorization'] = "Bearer {$accessToken}";
        }

        $removed = 0;

        foreach ($tickets->chunk(self::CHUNK_SIZE) as $chunk) {
            $ticketIds = $chunk->pluck('ticket_id')->values()->all();

            try {
                $response = Http::withHeaders($headers)->post(self::RECEIPTS_URL, ['ids' => $ticketIds]);
            } catch (\Throwable $exception) {
                Log::warning('Failed to fetch Expo push receipts.', ['error' => $exception->getMessage()]);

                continue;
            }

            if (! $response->successful()) {
                Log::warning('Expo receipts request failed.', ['status' => $response->status()]);

                continue;
            }

            $receipts = $response->json('data', []);

            foreach ($chunk as $ticket) {
                $receipt = $receipts[$ticket->ticket_id] ?? null;
                if (! $receipt) {
                    continue;
                }

                if (($receipt['details']['error'] ?? null) === 'DeviceNotRegistered' && $ticket->deviceToken) {
                    $ticket->deviceToken->delete();
                    $removed++;
                }

                $ticket->update(['checked_at' => now()]);
            }
        }

        // Old, already-checked tickets have no further use.
        PushTicket::whereNotNull('checked_at')
            ->where('checked_at', '<', now()->subDays(7))
            ->delete();

        $this->info("Checked {$tickets->count()} push tickets, removed {$removed} invalid device tokens.");

        return self::SUCCESS;
    }
}
