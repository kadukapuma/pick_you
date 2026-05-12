<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DriverLocation;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

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

        // Update or Create Location
        $location = DriverLocation::updateOrCreate(
            ['driver_id' => $driver->id],
            [
                'location' => DB::raw("point($request->longitude, $request->latitude)"),
                'heading' => $request->heading ?? 0,
                'speed' => $request->speed ?? 0,
            ]
        );

        // Refresh to get the actual database point string instead of the raw expression object
        $location->refresh();

        // TODO: Broadcast Location via Laravel Reverb / Pusher to the passenger

        return $this->success($location, 'Location updated successfully');
    }
}
