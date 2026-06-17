<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDriverLocationRequest;
use App\Services\Locations\DriverLocationService;
use App\Traits\ApiResponse;

class DriverLocationController extends Controller
{
    use ApiResponse;

    public function store(StoreDriverLocationRequest $request, DriverLocationService $locations)
    {
        $driver = $request->user()->driver;
        $location = $locations->update($driver, $request->validated());

        return $this->success($location, 'Location updated successfully');
    }
}
