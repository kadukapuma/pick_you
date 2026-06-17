<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;

class PersistDriverLocationSnapshot implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $driverId,
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly float $heading,
        public readonly float $speed,
    ) {
        $this->onQueue(config('location.queue', 'locations'));
    }

    public function handle(): void
    {
        DB::statement('
            INSERT INTO driver_locations (driver_id, location, location_geog, heading, speed, created_at, updated_at)
            VALUES (?, point(?, ?), ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, ?, NOW(), NOW())
            ON CONFLICT (driver_id)
            DO UPDATE SET location = EXCLUDED.location, location_geog = EXCLUDED.location_geog,
                heading = EXCLUDED.heading, speed = EXCLUDED.speed, updated_at = NOW()
        ', [
            $this->driverId, $this->longitude, $this->latitude, $this->longitude,
            $this->latitude, $this->heading, $this->speed,
        ]);
    }
}
