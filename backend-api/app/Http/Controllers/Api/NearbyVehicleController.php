<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NearbyVehicleController extends Controller
{
    use ApiResponse;

    public function index(Request $request)
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'vehicle_type' => ['nullable', 'string', 'max:50'],
        ]);
        $latitude = (float) $validated['latitude'];
        $longitude = (float) $validated['longitude'];
        $vehicleType = isset($validated['vehicle_type']) ? trim((string) $validated['vehicle_type']) : null;
        $radiusMeters = (float) config('ride.match_radius_km', 10) * 1000;
        $staleAfterSeconds = max(
            5,
            (int) config('location.stale_after_seconds', 20),
            (int) config('location.snapshot_interval_seconds', 30) + 10
        );
        $limit = min(50, max(1, (int) config('ride.match_max_drivers', 50)));
        $redisVehicles = $this->searchRedisNearby($latitude, $longitude, $radiusMeters, $staleAfterSeconds, $limit, $vehicleType);
        if ($redisVehicles !== null) {
            return $this->success($redisVehicles, 'Nearby vehicles retrieved successfully.');
        }

        $pickupPoint = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography';
        $vehicleTypeClause = $vehicleType ? 'AND LOWER(vt.name) = LOWER(?)' : '';
        $bindings = [$longitude, $latitude, $longitude, $latitude, $radiusMeters, now()->subSeconds($staleAfterSeconds)];
        if ($vehicleType) {
            $bindings[] = $vehicleType;
        }
        $bindings[] = $limit;

        $vehicles = DB::select("
            SELECT d.id AS driver_id, dl.latitude, dl.longitude, dl.heading, dl.speed,
                COALESCE(dl.recorded_at, dl.updated_at) AS recorded_at,
                vt.name AS vehicle_type,
                ST_Distance(dl.location_geog, {$pickupPoint}) AS distance_meters
            FROM driver_locations AS dl
            INNER JOIN drivers AS d ON d.id = dl.driver_id
            INNER JOIN LATERAL (
                SELECT v.vehicle_type_id FROM vehicles AS v
                WHERE v.driver_id = d.id AND v.is_active = true AND v.status = 'approved'
                ORDER BY v.id DESC LIMIT 1
            ) AS active_vehicle ON true
            INNER JOIN vehicle_types AS vt ON vt.id = active_vehicle.vehicle_type_id
            WHERE d.availability = 1 AND d.status = 'approved' AND dl.ride_id IS NULL
              AND dl.location_geog IS NOT NULL AND dl.latitude IS NOT NULL AND dl.longitude IS NOT NULL
              AND vt.is_active = true
              AND ST_DWithin(dl.location_geog, {$pickupPoint}, ?)
              AND COALESCE(dl.recorded_at, dl.updated_at) >= ?
              {$vehicleTypeClause}
            ORDER BY distance_meters ASC LIMIT ?
        ", $bindings);

        $data = collect($vehicles)->map(fn ($vehicle) => [
            'id' => hash_hmac('sha256', (string) $vehicle->driver_id, (string) config('app.key')),
            'latitude' => (float) $vehicle->latitude,
            'longitude' => (float) $vehicle->longitude,
            'heading' => (float) ($vehicle->heading ?? 0),
            'speed' => (float) ($vehicle->speed ?? 0),
            'recorded_at' => $vehicle->recorded_at,
            'vehicle_type' => (string) $vehicle->vehicle_type,
            'distance_meters' => round((float) $vehicle->distance_meters),
        ])->values();

        return $this->success($data, 'Nearby vehicles retrieved successfully.');
    }

    private function searchRedisNearby(
        float $latitude,
        float $longitude,
        float $radiusMeters,
        int $staleAfterSeconds,
        int $limit,
        ?string $vehicleType,
    ): ?array {
        try {
            $geoKey = config('location.geo_key', 'drivers:online:geo');
            $candidates = \Illuminate\Support\Facades\Redis::geosearch(
                $geoKey,
                'FROMLONLAT',
                (string) $longitude,
                (string) $latitude,
                'BYRADIUS',
                (string) ($radiusMeters / 1000),
                'km',
                'WITHDIST',
                'ASC',
                'COUNT',
                (string) ($limit * 3)
            );

            if (! is_array($candidates) || $candidates === []) {
                return null;
            }

            $driverIds = [];
            $distances = [];
            foreach ($candidates as $cand) {
                if (is_array($cand) && isset($cand[0])) {
                    $dId = (int) $cand[0];
                    $distKm = (float) ($cand[1] ?? 0);
                    $driverIds[] = $dId;
                    $distances[$dId] = $distKm * 1000;
                }
            }

            if ($driverIds === []) {
                return null;
            }

            $pipelineResults = \Illuminate\Support\Facades\Redis::pipeline(function ($pipe) use ($driverIds) {
                foreach ($driverIds as $dId) {
                    $pipe->get("driver:location:{$dId}");
                }
            });

            $activeDriverLocations = [];
            $staleThreshold = now()->subSeconds($staleAfterSeconds);

            foreach ($driverIds as $index => $dId) {
                $raw = $pipelineResults[$index] ?? null;
                if (! $raw) {
                    continue;
                }
                $loc = json_decode($raw, true);
                if (! is_array($loc) || ! empty($loc['ride_id'])) {
                    continue;
                }
                $recAt = isset($loc['recorded_at']) ? \Carbon\CarbonImmutable::parse($loc['recorded_at']) : null;
                if ($recAt && $recAt->lt($staleThreshold)) {
                    continue;
                }

                $activeDriverLocations[$dId] = [
                    'latitude' => (float) ($loc['latitude'] ?? 0),
                    'longitude' => (float) ($loc['longitude'] ?? 0),
                    'heading' => (float) ($loc['heading'] ?? 0),
                    'speed' => (float) ($loc['speed'] ?? 0),
                    'recorded_at' => $loc['recorded_at'] ?? now()->toIso8601String(),
                    'distance_meters' => round($distances[$dId] ?? 0),
                ];
            }

            if ($activeDriverLocations === []) {
                return null;
            }

            $eligibleDriverIds = array_keys($activeDriverLocations);
            $driverVehiclesQuery = DB::table('drivers as d')
                ->join('vehicles as v', function ($join) {
                    $join->on('v.driver_id', '=', 'd.id')
                        ->where('v.is_active', '=', true)
                        ->where(function ($q) {
                            $q->where('v.status', 'approved')->orWhereNull('v.status');
                        });
                })
                ->join('vehicle_types as vt', 'vt.id', '=', 'v.vehicle_type_id')
                ->whereIn('d.id', $eligibleDriverIds)
                ->where('d.availability', 1)
                ->where('d.status', 'approved')
                ->where('vt.is_active', true);

            if ($vehicleType) {
                $driverVehiclesQuery->whereRaw('LOWER(vt.name) = LOWER(?)', [$vehicleType]);
            }

            $driverVehicles = $driverVehiclesQuery->select('d.id as driver_id', 'vt.name as vehicle_type')->get();

            $vehicleTypeMap = [];
            foreach ($driverVehicles as $dv) {
                $vehicleTypeMap[(int) $dv->driver_id] = (string) $dv->vehicle_type;
            }

            $data = [];
            foreach ($eligibleDriverIds as $dId) {
                if (! isset($vehicleTypeMap[$dId])) {
                    continue;
                }
                $loc = $activeDriverLocations[$dId];
                $data[] = [
                    'id' => hash_hmac('sha256', (string) $dId, (string) config('app.key')),
                    'latitude' => $loc['latitude'],
                    'longitude' => $loc['longitude'],
                    'heading' => $loc['heading'],
                    'speed' => $loc['speed'],
                    'recorded_at' => $loc['recorded_at'],
                    'vehicle_type' => $vehicleTypeMap[$dId],
                    'distance_meters' => $loc['distance_meters'],
                ];
                if (count($data) >= $limit) {
                    break;
                }
            }

            return $data;
        } catch (\Throwable) {
            return null;
        }
    }
}
