<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;
use Throwable;

class DriverMatchingQuery
{
    public function __construct(
        private readonly DriverRejectionCooldown $cooldown,
    ) {}

    /**
     * Find nearest eligible drivers within radius, capped at max drivers.
     *
     * @return Collection<int, object{driver_id: int, distance_meters: float}>
     */
    public function findNearbyDrivers(float $pickupLat, float $pickupLng, string $vehicleType, ?int $rideId = null): Collection
    {
        $radiusMeters = (float) config('ride.match_radius_km', 10) * 1000;
        $maxDrivers = (int) config('ride.match_max_drivers', 50);
        $freshWithinSeconds = max(
            (int) config('location.stale_after_seconds', 300),
            300
        );

        $queryLimit = min($maxDrivers * 2, 100);
        $pickupPoint = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography';

        try {
            $drivers = DB::select("
                SELECT
                    d.id AS driver_id,
                    ST_Distance(dl.location_geog, {$pickupPoint}) AS distance_meters
                FROM driver_locations AS dl
                INNER JOIN drivers AS d ON dl.driver_id = d.id
                WHERE d.availability = 1
                  AND d.status = 'approved'
                  AND (
                    dl.ride_id IS NULL
                    OR dl.ride_id = 0
                    OR NOT EXISTS (
                      SELECT 1 FROM rides r WHERE r.id = dl.ride_id AND r.status IN ('ACCEPTED', 'ARRIVED', 'STARTED')
                    )
                  )
                  AND dl.location_geog IS NOT NULL
                  AND ST_DWithin(dl.location_geog, {$pickupPoint}, ?)
                  AND COALESCE(dl.recorded_at, dl.updated_at) >= ?
                  AND EXISTS (
                      SELECT 1
                      FROM vehicles AS v
                      INNER JOIN vehicle_types AS vt ON v.vehicle_type_id = vt.id
                      WHERE v.driver_id = d.id
                        AND v.is_active = true
                        AND (v.status = 'approved' OR v.status IS NULL)
                        AND vt.is_active = true
                        AND (
                          LOWER(vt.name) = LOWER(?)
                          OR LOWER(REPLACE(REPLACE(vt.name, '-', ''), ' ', '')) = LOWER(REPLACE(REPLACE(?, '-', ''), ' ', ''))
                        )
                  )
                ORDER BY distance_meters ASC
                LIMIT ?
            ", [
                $pickupLng,
                $pickupLat,
                $pickupLng,
                $pickupLat,
                $radiusMeters,
                now()->subSeconds($freshWithinSeconds),
                $vehicleType,
                $vehicleType,
                $queryLimit,
            ]);
            $collection = collect($drivers);
        } catch (Throwable $e) {
            Log::warning('PostGIS spatial query failed; falling back to Redis/DB location matching.', [
                'error' => $e->getMessage(),
            ]);
            $collection = collect();
        }

        // Fallback 1: Query online drivers from Redis GEO index
        if ($collection->isEmpty()) {
            $collection = $this->findNearbyDriversFromRedis($pickupLat, $pickupLng, $vehicleType, $radiusMeters);
        }

        // Fallback 2: Query online drivers from database using SQL Haversine formula
        if ($collection->isEmpty()) {
            $collection = $this->findNearbyDriversFromDatabase($pickupLat, $pickupLng, $vehicleType, $radiusMeters);
        }

        if ($collection->isEmpty()) {
            return $collection;
        }

        $driverIds = $collection->pluck('driver_id')->map(fn ($id) => (int) $id)->all();
        $cooledDown = $this->cooldown->filterCooledDown($driverIds, $rideId);

        return $collection
            ->reject(fn ($driver) => in_array((int) $driver->driver_id, $cooledDown, true))
            ->take($maxDrivers)
            ->values();
    }

    private function findNearbyDriversFromRedis(float $pickupLat, float $pickupLng, string $vehicleType, float $radiusMeters): Collection
    {
        try {
            $geoKey = config('location.geo_key', 'drivers:online:geo');
            $maxDrivers = (int) config('ride.match_max_drivers', 50);
            $candidates = Redis::georadius(
                $geoKey,
                $pickupLng,
                $pickupLat,
                $radiusMeters / 1000,
                'km',
                ['WITHDIST', 'asc', 'COUNT' => $maxDrivers * 2]
            );

            if (! is_array($candidates) || $candidates === []) {
                return collect();
            }

            $driverDistanceMap = [];
            foreach ($candidates as $cand) {
                if (is_array($cand) && isset($cand[0])) {
                    $dId = (int) $cand[0];
                    $distMeters = (float) ($cand[1] ?? 0) * 1000;
                    $driverDistanceMap[$dId] = $distMeters;
                }
            }

            if ($driverDistanceMap === []) {
                return collect();
            }

            $driverDistanceMap = $this->filterFreshDrivers($driverDistanceMap);

            if ($driverDistanceMap === []) {
                return collect();
            }

            $candidateDriverIds = array_keys($driverDistanceMap);
            $eligibleDriverIds = DB::table('drivers as d')
                ->whereIn('d.id', $candidateDriverIds)
                ->where('d.availability', 1)
                ->where('d.status', 'approved')
                ->whereExists(function ($query) use ($vehicleType) {
                    $query->select(DB::raw(1))
                        ->from('vehicles as v')
                        ->join('vehicle_types as vt', 'v.vehicle_type_id', '=', 'vt.id')
                        ->whereColumn('v.driver_id', 'd.id')
                        ->where('v.is_active', true)
                        ->where(function ($q) {
                            $q->where('v.status', 'approved')->orWhereNull('v.status');
                        })
                        ->where('vt.is_active', true)
                        ->whereRaw(
                            "(LOWER(vt.name) = LOWER(?) OR LOWER(REPLACE(REPLACE(vt.name, '-', ''), ' ', '')) = LOWER(REPLACE(REPLACE(?, '-', ''), ' ', '')))",
                            [$vehicleType, $vehicleType]
                        );
                })
                ->pluck('d.id')
                ->map(fn ($id) => (int) $id)
                ->all();

            $redisDrivers = [];
            foreach ($candidateDriverIds as $dId) {
                if (in_array($dId, $eligibleDriverIds, true)) {
                    $redisDrivers[] = (object) [
                        'driver_id' => $dId,
                        'distance_meters' => $driverDistanceMap[$dId],
                    ];
                }
            }

            if ($redisDrivers !== []) {
                usort($redisDrivers, fn ($a, $b) => $a->distance_meters <=> $b->distance_meters);

                return collect($redisDrivers);
            }
        } catch (Throwable $e) {
            Log::error('findNearbyDriversFromRedis failed:', ['error' => $e->getMessage()]);
        }

        return collect();
    }

    private function findNearbyDriversFromDatabase(float $pickupLat, float $pickupLng, string $vehicleType, float $radiusMeters): Collection
    {
        try {
            $freshWithinSeconds = max((int) config('location.stale_after_seconds', 300), 300);
            $maxDrivers = (int) config('ride.match_max_drivers', 50);

            $drivers = DB::table('driver_locations as dl')
                ->join('drivers as d', 'dl.driver_id', '=', 'd.id')
                ->where('d.availability', 1)
                ->where('d.status', 'approved')
                ->whereNotNull('dl.latitude')
                ->whereNotNull('dl.longitude')
                ->where(function ($q) use ($freshWithinSeconds) {
                    $q->where('dl.recorded_at', '>=', now()->subSeconds($freshWithinSeconds))
                      ->orWhere('dl.updated_at', '>=', now()->subSeconds($freshWithinSeconds));
                })
                ->whereExists(function ($query) use ($vehicleType) {
                    $query->select(DB::raw(1))
                        ->from('vehicles as v')
                        ->join('vehicle_types as vt', 'v.vehicle_type_id', '=', 'vt.id')
                        ->whereColumn('v.driver_id', 'd.id')
                        ->where('v.is_active', true)
                        ->where(function ($q) {
                            $q->where('v.status', 'approved')->orWhereNull('v.status');
                        })
                        ->where('vt.is_active', true)
                        ->whereRaw(
                            "(LOWER(vt.name) = LOWER(?) OR LOWER(REPLACE(REPLACE(vt.name, '-', ''), ' ', '')) = LOWER(REPLACE(REPLACE(?, '-', ''), ' ', '')))",
                            [$vehicleType, $vehicleType]
                        );
                })
                ->select(['d.id as driver_id', 'dl.latitude', 'dl.longitude'])
                ->get();

            $results = [];
            foreach ($drivers as $d) {
                $dist = $this->haversineMeters($pickupLat, $pickupLng, (float) $d->latitude, (float) $d->longitude);
                if ($dist <= $radiusMeters) {
                    $results[] = (object) [
                        'driver_id' => (int) $d->driver_id,
                        'distance_meters' => $dist,
                    ];
                }
            }

            if ($results !== []) {
                usort($results, fn ($a, $b) => $a->distance_meters <=> $b->distance_meters);

                return collect($results)->take($maxDrivers);
            }
        } catch (Throwable $e) {
            Log::error('findNearbyDriversFromDatabase failed:', ['error' => $e->getMessage()]);
        }

        return collect();
    }

    /**
     * Drop drivers whose GEO index entry has no corresponding fresh
     * `driver:location:{id}` key — a crashed/killed app can leave a driver
     * in the GEO set without ever refreshing (or clearing) its location key.
     *
     * @param  array<int, float>  $driverDistanceMap
     * @return array<int, float>
     */
    private function filterFreshDrivers(array $driverDistanceMap): array
    {
        try {
            $driverIds = array_keys($driverDistanceMap);
            $staleThreshold = now()->subSeconds((int) config('location.stale_after_seconds', 20));

            $pipelineResults = Redis::pipeline(function ($pipe) use ($driverIds) {
                foreach ($driverIds as $dId) {
                    $pipe->get("driver:location:{$dId}");
                }
            });

            $fresh = [];
            foreach ($driverIds as $index => $dId) {
                $raw = $pipelineResults[$index] ?? null;
                if (! $raw) {
                    continue;
                }

                $loc = json_decode($raw, true);
                if (! is_array($loc) || ! isset($loc['recorded_at'])) {
                    continue;
                }

                if (\Carbon\CarbonImmutable::parse($loc['recorded_at'])->lt($staleThreshold)) {
                    continue;
                }

                $fresh[$dId] = $driverDistanceMap[$dId];
            }

            return $fresh;
        } catch (Throwable $e) {
            Log::warning('filterFreshDrivers staleness check failed; returning unfiltered candidates.', [
                'error' => $e->getMessage(),
            ]);

            return $driverDistanceMap;
        }
    }

    private function haversineMeters(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLng / 2) * sin($dLng / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadius * $c;
    }
}
