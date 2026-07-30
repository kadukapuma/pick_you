<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class PruneStaleOnlineDrivers extends Command
{
    protected $signature = 'drivers:prune-stale-online {--chunk=500 : How many GEO members to scan per Redis round trip}';

    protected $description = 'Remove drivers from the online GEO index whose location key has expired (crashed/killed app never went offline explicitly).';

    public function handle(): int
    {
        $geoKey = config('location.geo_key', 'drivers:online:geo');
        $chunkSize = max(1, (int) $this->option('chunk'));

        $driverIds = Redis::zrange($geoKey, 0, -1);

        if (empty($driverIds)) {
            $this->info('No drivers in the online GEO index.');

            return self::SUCCESS;
        }

        $removed = 0;

        foreach (array_chunk($driverIds, $chunkSize) as $chunk) {
            $pipelineResults = Redis::pipeline(function ($pipe) use ($chunk) {
                foreach ($chunk as $driverId) {
                    $pipe->exists("driver:location:{$driverId}");
                }
            });

            $staleIds = [];
            foreach ($chunk as $index => $driverId) {
                if (empty($pipelineResults[$index])) {
                    $staleIds[] = $driverId;
                }
            }

            if ($staleIds !== []) {
                Redis::zrem($geoKey, ...$staleIds);
                $removed += count($staleIds);
            }
        }

        $this->info("Removed {$removed} stale driver(s) from the online GEO index.");

        return self::SUCCESS;
    }
}
