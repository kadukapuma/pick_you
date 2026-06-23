<?php

namespace App\Services\RideMatching;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

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
    public function findNearbyDrivers(float $pickupLat, float $pickupLng, string $vehicleType): Collection
    {
        $radiusMeters = (float) config('ride.match_radius_km', 10) * 1000;
        $maxDrivers = (int) config('ride.match_max_drivers', 50);

        // Fetch extra candidates to absorb rejection-cooldown filtering without under-filling the queue.
        $queryLimit = min($maxDrivers * 2, 100);

        $pickupPoint = "ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography";

        $drivers = DB::select("
            SELECT
                d.id AS driver_id,
                ST_Distance(dl.location_geog, {$pickupPoint}) AS distance_meters
            FROM driver_locations AS dl
            INNER JOIN drivers AS d ON dl.driver_id = d.id
            WHERE d.availability = 1
              AND d.status = 'approved'
              AND dl.location_geog IS NOT NULL
              AND ST_DWithin(dl.location_geog, {$pickupPoint}, ?)
              AND EXISTS (
                  SELECT 1
                  FROM vehicles AS v
                  INNER JOIN vehicle_types AS vt ON v.vehicle_type_id = vt.id
                  WHERE v.driver_id = d.id
                    AND v.is_active = true
                    AND vt.name = ?
              )
            ORDER BY distance_meters ASC
            LIMIT ?
        ", [
            $pickupLng,
            $pickupLat,
            $pickupLng,
            $pickupLat,
            $radiusMeters,
            $vehicleType,
            $queryLimit,
        ]);

        $collection = collect($drivers);

        if ($collection->isEmpty()) {
            return $collection;
        }

        $driverIds = $collection->pluck('driver_id')->map(fn ($id) => (int) $id)->all();
        $cooledDown = $this->cooldown->filterCooledDown($driverIds);

        return $collection
            ->reject(fn ($driver) => in_array((int) $driver->driver_id, $cooledDown, true))
            ->take($maxDrivers)
            ->values();
    }
}
