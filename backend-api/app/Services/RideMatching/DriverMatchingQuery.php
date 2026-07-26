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

        // Fallback: If DB spatial query returns 0 drivers, query online drivers directly from Redis & DB
        if ($collection->isEmpty()) {
            $collection = $this->findNearbyDriversFromRedis($pickupLat, $pickupLng, $vehicleType, $radiusMeters);
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
            $onlineDriverIds = DB::table('drivers as d')
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
                ->pluck('d.id');

            $redisDrivers = [];
            foreach ($onlineDriverIds as $dId) {
                $driverId = (int) $dId;
                $dLat = 0.0;
                $dLng = 0.0;

                // 1. Check Redis string key
                $locationJson = Redis::get("driver:location:{$driverId}");
                if ($locationJson) {
                    $loc = json_decode($locationJson, true);
                    $dLat = (float) ($loc['latitude'] ?? 0);
                    $dLng = (float) ($loc['longitude'] ?? 0);
                }

                // 2. Check Redis Geo ZSet if string key was empty
                if ($dLat === 0.0 || $dLng === 0.0) {
                    try {
                        $geoPos = Redis::geopos(config('location.geo_key', 'drivers:online:geo'), (string) $driverId);
                        if (! empty($geoPos[0]) && is_array($geoPos[0])) {
                            $dLng = (float) $geoPos[0][0];
                            $dLat = (float) $geoPos[0][1];
                        }
                    } catch (Throwable) {
                        // ignore geo error
                    }
                }

                // 3. Check DB driver_locations table if Redis keys were empty
                if ($dLat === 0.0 || $dLng === 0.0) {
                    $dbLoc = DB::table('driver_locations')->where('driver_id', $driverId)->first();
                    if ($dbLoc) {
                        $dLat = (float) ($dbLoc->latitude ?? 0);
                        $dLng = (float) ($dbLoc->longitude ?? 0);
                    }
                }

                if ($dLat === 0.0 || $dLng === 0.0) {
                    continue;
                }

                $dist = $this->haversineMeters($pickupLat, $pickupLng, $dLat, $dLng);
                if ($dist <= $radiusMeters) {
                    $redisDrivers[] = (object) [
                        'driver_id' => $driverId,
                        'distance_meters' => $dist,
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
