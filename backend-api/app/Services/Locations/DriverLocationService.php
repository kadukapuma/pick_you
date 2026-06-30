<?php

namespace App\Services\Locations;

use App\Events\DriverLocationUpdated;
use App\Jobs\PersistDriverLocationSnapshot;
use App\Jobs\ProcessRideLocationPoint;
use App\Models\Driver;
use App\Models\DriverLocation;
use App\Models\Ride;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

class DriverLocationService
{
    public function removeOfflineDriver(Driver $driver): void
    {
        try {
            Redis::pipeline(function ($pipe) use ($driver) {
                $pipe->del($this->latestKey((int) $driver->id));
                $pipe->zrem(config('location.geo_key', 'drivers:online:geo'), (string) $driver->id);
            });
        } catch (Throwable $exception) {
            Log::warning('Could not remove offline driver from Redis location indexes.', [
                'driver_id' => $driver->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    public function update(Driver $driver, array $data): array
    {
        $recordedAt = isset($data['recorded_at'])
            ? CarbonImmutable::parse($data['recorded_at'])->utc()
            : CarbonImmutable::now('UTC');

        $payload = [
            'driver_id' => (int) $driver->id,
            'latitude' => (float) $data['latitude'],
            'longitude' => (float) $data['longitude'],
            'heading' => (float) ($data['heading'] ?? 0),
            'speed' => (float) ($data['speed'] ?? 0),
            'accuracy' => isset($data['accuracy']) ? (float) $data['accuracy'] : null,
            'recorded_at' => $recordedAt->toIso8601String(),
            'sequence' => (int) ($data['sequence'] ?? $recordedAt->getTimestampMs()),
        ];

        $activeRide = null;

        if (! empty($data['ride_id'])) {
            $activeRide = Ride::query()
                ->where('id', $data['ride_id'])
                ->where('driver_id', $driver->id)
                ->whereIn('status', ['ACCEPTED', 'ARRIVED', 'STARTED'])
                ->first();
        }

        if (! $activeRide) {
            $activeRide = Ride::query()
                ->where('driver_id', $driver->id)
                ->whereIn('status', ['ACCEPTED', 'ARRIVED', 'STARTED'])
                ->latest('accepted_at')
                ->first();
        }

        if ($activeRide) {
            $payload['ride_id'] = (int) $activeRide->id;
        }

        try {
            $existing = Redis::get($this->latestKey($payload['driver_id']));
            if ($existing) {
                $existingPayload = json_decode($existing, true, flags: JSON_THROW_ON_ERROR);
                if (($existingPayload['sequence'] ?? 0) > $payload['sequence']) {
                    return $existingPayload;
                }
            }

            Redis::pipeline(function ($pipe) use ($payload) {
                $pipe->setex(
                    $this->latestKey($payload['driver_id']),
                    config('location.latest_ttl_seconds', 60),
                    json_encode($payload, JSON_THROW_ON_ERROR),
                );
                $pipe->geoadd(
                    config('location.geo_key', 'drivers:online:geo'),
                    $payload['longitude'],
                    $payload['latitude'],
                    (string) $payload['driver_id'],
                );

                if (! empty($payload['ride_id'])) {
                    $pipe->setex(
                        $this->latestRideKey((int) $payload['ride_id']),
                        config('location.latest_ttl_seconds', 60),
                        json_encode($payload, JSON_THROW_ON_ERROR),
                    );
                }
            });
        } catch (Throwable $exception) {
            Log::warning('Driver location Redis write failed; snapshot queued.', [
                'driver_id' => $driver->id,
                'error' => $exception->getMessage(),
            ]);
        }

        $this->queueSnapshot($payload);

        if ($activeRide) {
            try {
                event(new DriverLocationUpdated(
                    ride_id: (int) $activeRide->id,
                    driver_id: $payload['driver_id'],
                    latitude: $payload['latitude'],
                    longitude: $payload['longitude'],
                    heading: $payload['heading'],
                    speed: $payload['speed'],
                    accuracy: $payload['accuracy'],
                    recorded_at: $payload['recorded_at'],
                    sequence: $payload['sequence'],
                ));
            } catch (Throwable $exception) {
                Log::warning('Driver location broadcast could not be queued.', [
                    'ride_id' => $activeRide->id,
                    'error' => $exception->getMessage(),
                ]);
            }
        }

        return $payload;
    }

    public function latestForRide(Ride $ride): ?array
    {
        if (! $ride->driver_id || ! in_array($ride->status, ['ACCEPTED', 'ARRIVED', 'STARTED'], true)) {
            return null;
        }

        try {
            $rideEncoded = Redis::get($this->latestRideKey((int) $ride->id));

            if ($rideEncoded) {
                $payload = json_decode($rideEncoded, true, flags: JSON_THROW_ON_ERROR);
                $payload['is_stale'] = CarbonImmutable::parse($payload['recorded_at'])
                    ->lt(CarbonImmutable::now('UTC')->subSeconds(config('location.stale_after_seconds', 20)));

                return $payload;
            }

            $encoded = Redis::get($this->latestKey((int) $ride->driver_id));

            if ($encoded) {
                $payload = json_decode($encoded, true, flags: JSON_THROW_ON_ERROR);
                $payload['ride_id'] = (int) $ride->id;
                $payload['is_stale'] = CarbonImmutable::parse($payload['recorded_at'])
                    ->lt(CarbonImmutable::now('UTC')->subSeconds(config('location.stale_after_seconds', 20)));

                return $payload;
            }
        } catch (Throwable $exception) {
            Log::warning('Driver location Redis read failed; using database fallback.', [
                'ride_id' => $ride->id,
                'error' => $exception->getMessage(),
            ]);
        }

        $location = DriverLocation::query()
            ->where('driver_id', $ride->driver_id)
            ->first();

        if (! $location) {
            return null;
        }

        return [
            'ride_id' => (int) $ride->id,
            'driver_id' => (int) $ride->driver_id,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
            'heading' => (float) $location->heading,
            'speed' => (float) $location->speed,
            'accuracy' => null,
            'recorded_at' => optional($location->updated_at)?->toIso8601String(),
            'sequence' => optional($location->updated_at)?->getTimestampMs() ?? 0,
            'is_stale' => ! $location->updated_at
                || $location->updated_at->lt(now()->subSeconds(config('location.stale_after_seconds', 20))),
        ];
    }

    private function queueSnapshot(array $payload): void
    {
        if (! empty($payload['ride_id'])) {
            $shouldPersist = true;
        } else {
            try {
                $shouldPersist = Cache::store('redis')->add(
                    'driver:location:snapshot-lock:'.$payload['driver_id'],
                    true,
                    config('location.snapshot_interval_seconds', 30),
                );
            } catch (Throwable) {
                $shouldPersist = true;
            }
        }

        if ($shouldPersist) {
            $job = new PersistDriverLocationSnapshot(
                $payload['driver_id'],
                $payload['latitude'],
                $payload['longitude'],
                $payload['heading'],
                $payload['speed'],
                $payload['ride_id'] ?? null,
                $payload['recorded_at'] ?? null,
                $payload['sequence'] ?? null,
            );

            try {
                dispatch($job);
            } catch (Throwable $exception) {
                Log::warning('Location snapshot queue unavailable; persisting directly.', [
                    'driver_id' => $payload['driver_id'],
                    'error' => $exception->getMessage(),
                ]);
                $job->handle();
            }
        }

        if (! empty($payload['ride_id'])) {
            $job = new ProcessRideLocationPoint($payload);

            try {
                dispatch($job);
            } catch (Throwable $exception) {
                Log::warning('Ride location processing queue unavailable; processing directly.', [
                    'ride_id' => $payload['ride_id'],
                    'driver_id' => $payload['driver_id'],
                    'error' => $exception->getMessage(),
                ]);
                app(\App\Services\Locations\RideLocationPointProcessor::class)->process($payload);
            }
        }
    }

    private function latestKey(int $driverId): string
    {
        return 'driver:location:'.$driverId;
    }

    private function latestRideKey(int $rideId): string
    {
        return 'ride:location:'.$rideId;
    }
}
