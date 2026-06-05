<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class DriverLocationController extends Controller
{
    use ApiResponse;

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
            'heading' => 'nullable|numeric',
            'speed' => 'nullable|numeric',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        $driver = $request->user()->driver;
        $latitude = (float) $request->latitude;
        $longitude = (float) $request->longitude;
        $heading = $request->heading ?? 0;
        $speed = $request->speed ?? 0;

        DB::statement('
            INSERT INTO driver_locations (driver_id, location, location_geog, heading, speed, created_at, updated_at)
            VALUES (?, point(?, ?), ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?, ?, NOW(), NOW())
            ON CONFLICT (driver_id)
            DO UPDATE SET
                location = EXCLUDED.location,
                location_geog = EXCLUDED.location_geog,
                heading = EXCLUDED.heading,
                speed = EXCLUDED.speed,
                updated_at = NOW()
        ', [
            $driver->id,
            $longitude,
            $latitude,
            $longitude,
            $latitude,
            $heading,
            $speed,
        ]);

        $location = DriverLocation::where('driver_id', $driver->id)->firstOrFail();

        return $this->success($location, 'Location updated successfully');
    }
}
