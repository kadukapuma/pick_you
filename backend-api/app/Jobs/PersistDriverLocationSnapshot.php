<?php

namespace App\Jobs;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PersistDriverLocationSnapshot implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly int $driverId,
        public readonly float $latitude,
        public readonly float $longitude,
        public readonly float $heading,
        public readonly float $speed,
        public readonly ?int $rideId = null,
        public readonly ?string $recordedAt = null,
        public readonly ?int $sequence = null,
    ) {
        $this->onQueue(config('location.queue', 'locations'));
    }

    public function handle(): void
    {
        $recordedAt = $this->recordedAt
            ? CarbonImmutable::parse($this->recordedAt)->utc()
            : CarbonImmutable::now('UTC');
        $now = CarbonImmutable::now('UTC');

        $latestPayload = $this->withSpatialColumns([
            'driver_id' => $this->driverId,
            'latitude' => $this->latitude,
            'longitude' => $this->longitude,
            'ride_id' => $this->rideId,
            'heading' => $this->heading,
            'speed' => $this->speed,
            'recorded_at' => $recordedAt,
            'sequence' => $this->sequence,
            'updated_at' => $now,
        ]);

        $updated = DB::table('driver_locations')
            ->where('driver_id', $this->driverId)
            ->update($latestPayload);

        if ($updated === 0) {
            DB::table('driver_locations')->insert([
                ...$latestPayload,
                'created_at' => $now,
            ]);
        }

        if ($this->rideId === null) {
            return;
        }
    }

    private function withSpatialColumns(array $payload): array
    {
        if (! Schema::hasColumn('driver_locations', 'ride_id')) {
            unset($payload['ride_id']);
        }

        if (Schema::hasColumn('driver_locations', 'location')) {
            $payload['location'] = DB::raw("point({$this->longitude}, {$this->latitude})");
        }

        if (Schema::hasColumn('driver_locations', 'location_geog')) {
            $payload['location_geog'] = DB::raw(
                "ST_SetSRID(ST_MakePoint({$this->longitude}, {$this->latitude}), 4326)::geography"
            );
        }

        return $payload;
    }
}
