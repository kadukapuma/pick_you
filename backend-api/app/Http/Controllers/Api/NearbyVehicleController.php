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
            (int) config('location.snapshot_interval_seconds', 30) + 10,
        );
        $limit = min(50, max(1, (int) config('ride.match_max_drivers', 50)));
        $pickupPoint = 'ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography';
        $vehicleTypeClause = $vehicleType ? 'AND LOWER(vt.name) = LOWER(?)' : '';
        $bindings = [$longitude, $latitude, $longitude, $latitude, $radiusMeters, $staleAfterSeconds];
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
              AND COALESCE(dl.recorded_at, dl.updated_at) >= NOW() - (? * INTERVAL '1 second')
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
}
