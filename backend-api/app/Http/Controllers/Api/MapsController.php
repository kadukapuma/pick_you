<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\GoogleMapsException;
use App\Http\Controllers\Controller;
use App\Services\Maps\GoogleMapsService;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MapsController extends Controller
{
    use ApiResponse;

    public function __construct(private readonly GoogleMapsService $maps) {}

    public function autocomplete(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'input' => 'required|string|min:2|max:120',
            'session_token' => 'required|string|min:8|max:120',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            return $this->success($this->maps->autocomplete(
                $request->string('input')->toString(),
                $request->string('session_token')->toString(),
                $request->filled('latitude') ? (float) $request->latitude : null,
                $request->filled('longitude') ? (float) $request->longitude : null,
            ), 'Place predictions retrieved successfully');
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }
    }

    public function details(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'place_id' => 'required|string|max:255',
            'session_token' => 'required|string|min:8|max:120',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            return $this->success($this->maps->placeDetails(
                $request->string('place_id')->toString(),
                $request->string('session_token')->toString(),
            ), 'Place details retrieved successfully');
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }
    }

    public function reverseGeocode(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            return $this->success($this->maps->reverseGeocode(
                (float) $request->latitude,
                (float) $request->longitude,
            ), 'Location reverse geocoded successfully');
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }
    }

    public function routes(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'origin.latitude' => 'required|numeric|between:-90,90',
            'origin.longitude' => 'required|numeric|between:-180,180',
            'destination.latitude' => 'required|numeric|between:-90,90',
            'destination.longitude' => 'required|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return $this->error('Validation Error', 422, $validator->errors());
        }

        try {
            return $this->success($this->maps->route(
                (float) $request->input('origin.latitude'),
                (float) $request->input('origin.longitude'),
                (float) $request->input('destination.latitude'),
                (float) $request->input('destination.longitude'),
            ), 'Route retrieved successfully');
        } catch (GoogleMapsException $exception) {
            return $this->error($exception->getMessage(), $exception->statusCode());
        }
    }
}
