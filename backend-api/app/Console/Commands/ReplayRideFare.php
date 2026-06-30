<?php

namespace App\Console\Commands;

use App\Models\Ride;
use App\Services\Locations\RideLocationPointProcessor;
use Illuminate\Console\Command;

class ReplayRideFare extends Command
{
    protected $signature = 'rides:fare-replay {ride_id}';

    protected $description = 'Replay accepted ride GPS points and compare them with stored fare distance totals.';

    public function handle(RideLocationPointProcessor $processor): int
    {
        $ride = Ride::find((int) $this->argument('ride_id'));

        if (! $ride) {
            $this->error('Ride not found.');
            return self::FAILURE;
        }

        $this->line(json_encode($processor->replay($ride), JSON_PRETTY_PRINT));

        return self::SUCCESS;
    }
}
