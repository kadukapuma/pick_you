<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Models\Vehicle;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function getStats()
    {
        // Measure database latency
        $start = microtime(true);
        DB::select('SELECT 1');
        $latency = round((microtime(true) - $start) * 1000, 2);

        // Get recent activity (drivers)
        $recentDrivers = Driver::with('user')
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($driver) {
                return [
                    'id' => $driver->id,
                    'type' => 'driver',
                    'action' => $driver->created_at == $driver->updated_at ? 'Registered' : 'Updated',
                    'name' => $driver->user ? $driver->user->first_name . ' ' . $driver->user->last_name : 'Unknown Driver',
                    'time' => $driver->updated_at->diffForHumans(),
                    'timestamp' => $driver->updated_at
                ];
            });

        // Get recent activity (vehicles)
        $recentVehicles = Vehicle::orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($vehicle) {
                return [
                    'id' => $vehicle->id,
                    'type' => 'vehicle',
                    'action' => $vehicle->created_at == $vehicle->updated_at ? 'Registered' : 'Updated',
                    'name' => $vehicle->plate_number,
                    'time' => $vehicle->updated_at->diffForHumans(),
                    'timestamp' => $vehicle->updated_at
                ];
            });

        // Merge and sort activities
        $activities = $recentDrivers->concat($recentVehicles)
            ->sortByDesc('timestamp')
            ->values()
            ->take(6);

        return response()->json([
            'status' => 'success',
            'health' => [
                'api' => 'Operational',
                'database_latency' => $latency . 'ms',
            ],
            'recent_activity' => $activities
        ]);
    }
}
