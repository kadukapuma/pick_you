<?php

namespace App\Services\Maps;

use App\Exceptions\GoogleMapsException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class GoogleMapsService
{
    public function autocomplete(string $input, string $sessionToken, ?float $latitude = null, ?float $longitude = null): array
    {
        $body = [
            'input' => $input,
            'sessionToken' => $sessionToken,
            'includedRegionCodes' => [config('google_maps.country', 'lk')],
            'languageCode' => config('google_maps.language', 'en'),
            'includeQueryPredictions' => false,
        ];

        if ($latitude !== null && $longitude !== null) {
            $body['locationBias'] = [
                'circle' => [
                    'center' => [
                        'latitude' => $latitude,
                        'longitude' => $longitude,
                    ],
                    'radius' => 50000,
                ],
            ];
        }

        $response = $this->googlePost(
            (string) config('google_maps.endpoints.places_autocomplete'),
            $body,
            'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types',
        );

        return collect($response['suggestions'] ?? [])
            ->map(fn (array $suggestion, int $index) => $this->normalizePrediction($suggestion['placePrediction'] ?? [], $index))
            ->filter()
            ->values()
            ->all();
    }

    public function placeDetails(string $placeId, string $sessionToken): array
    {
        $url = rtrim((string) config('google_maps.endpoints.place_details'), '/').'/'.$placeId;
        $response = $this->googleGet($url, [
            'languageCode' => config('google_maps.language', 'en'),
            'regionCode' => config('google_maps.region', 'LK'),
            'sessionToken' => $sessionToken,
        ], 'id,formattedAddress,location,displayName,types');

        $lat = $response['location']['latitude'] ?? null;
        $lng = $response['location']['longitude'] ?? null;

        if (! is_numeric($lat) || ! is_numeric($lng)) {
            throw new GoogleMapsException('Google Place Details did not return coordinates.');
        }

        $displayName = $response['displayName']['text'] ?? null;
        $address = $response['formattedAddress'] ?? $displayName ?? 'Selected location';

        return [
            'id' => 'google_'.$response['id'],
            'placeId' => $response['id'],
            'address' => $displayName ?: $address,
            'details' => $address,
            'latitude' => (float) $lat,
            'longitude' => (float) $lng,
            'placeType' => $this->placeType($response['types'] ?? []),
            'provider' => 'google',
        ];
    }

    public function reverseGeocode(float $latitude, float $longitude): array
    {
        $response = $this->legacyGet((string) config('google_maps.endpoints.geocode'), [
            'latlng' => $latitude.','.$longitude,
            'language' => config('google_maps.language', 'en'),
            'region' => config('google_maps.country', 'lk'),
        ]);

        $result = $response['results'][0] ?? null;

        if (! $result) {
            throw new GoogleMapsException('No address found for this location.', 404);
        }

        $address = $result['formatted_address'] ?? 'Selected location';

        return [
            'id' => 'google_reverse_'.md5($latitude.','.$longitude),
            'placeId' => $result['place_id'] ?? null,
            'address' => $this->shortAddress($address),
            'details' => $address,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'placeType' => 'address',
            'provider' => 'google',
        ];
    }

    public function route(float $originLat, float $originLng, float $destinationLat, float $destinationLng): array
    {
        $cacheKey = sprintf(
            'google-route:%0.5f,%0.5f:%0.5f,%0.5f',
            $originLat,
            $originLng,
            $destinationLat,
            $destinationLng,
        );

        return Cache::remember($cacheKey, (int) config('google_maps.route_cache_ttl_seconds', 300), function () use (
            $originLat,
            $originLng,
            $destinationLat,
            $destinationLng,
        ) {
            $response = $this->googlePost(
                (string) config('google_maps.endpoints.routes'),
                [
                    'origin' => [
                        'location' => [
                            'latLng' => [
                                'latitude' => $originLat,
                                'longitude' => $originLng,
                            ],
                        ],
                    ],
                    'destination' => [
                        'location' => [
                            'latLng' => [
                                'latitude' => $destinationLat,
                                'longitude' => $destinationLng,
                            ],
                        ],
                    ],
                    'travelMode' => 'DRIVE',
                    'routingPreference' => 'TRAFFIC_AWARE',
                    'computeAlternativeRoutes' => false,
                    'units' => 'METRIC',
                    'polylineQuality' => 'OVERVIEW',
                ],
                'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
            );

            $route = $response['routes'][0] ?? null;
            if (! $route) {
                throw new GoogleMapsException('No route found for these coordinates.', 404);
            }

            $distance = (int) ($route['distanceMeters'] ?? 0);
            $duration = $this->durationSeconds((string) ($route['duration'] ?? '0s'));
            $encodedPolyline = (string) ($route['polyline']['encodedPolyline'] ?? '');
            $polyline = $encodedPolyline !== '' ? $this->decodePolyline($encodedPolyline) : [];

            return [
                'distance' => $distance,
                'duration' => $duration,
                'polyline' => $polyline,
                'distanceText' => $this->formatDistance($distance),
                'durationText' => $this->formatDuration($duration),
            ];
        });
    }

    private function normalizePrediction(array $prediction, int $index): ?array
    {
        $placeId = $prediction['placeId'] ?? null;
        if (! $placeId) {
            return null;
        }

        $text = $prediction['text']['text'] ?? 'Location';
        $main = $prediction['structuredFormat']['mainText']['text'] ?? $this->shortAddress($text);
        $secondary = $prediction['structuredFormat']['secondaryText']['text'] ?? $text;

        return [
            'id' => 'google_prediction_'.$index.'_'.md5($placeId),
            'placeId' => $placeId,
            'address' => $main,
            'details' => $secondary,
            'placeType' => $this->placeType($prediction['types'] ?? []),
            'provider' => 'google',
        ];
    }

    private function googlePost(string $url, array $body, string $fieldMask): array
    {
        $this->ensureApiKey();

        try {
            $response = Http::timeout((int) config('google_maps.timeout_seconds', 8))
                ->withHeaders([
                    'X-Goog-Api-Key' => (string) config('google_maps.api_key'),
                    'X-Goog-FieldMask' => $fieldMask,
                ])
                ->post($url, $body);
        } catch (ConnectionException $exception) {
            throw new GoogleMapsException('Google Maps request could not reach '.parse_url($url, PHP_URL_HOST).'.');
        }

        return $this->jsonOrFail($response->status(), $response->json(), $url);
    }

    private function googleGet(string $url, array $query, string $fieldMask): array
    {
        $this->ensureApiKey();

        try {
            $response = Http::timeout((int) config('google_maps.timeout_seconds', 8))
                ->withHeaders([
                    'X-Goog-Api-Key' => (string) config('google_maps.api_key'),
                    'X-Goog-FieldMask' => $fieldMask,
                ])
                ->get($url, $query);
        } catch (ConnectionException $exception) {
            throw new GoogleMapsException('Google Maps request could not reach '.parse_url($url, PHP_URL_HOST).'.');
        }

        return $this->jsonOrFail($response->status(), $response->json(), $url);
    }

    private function legacyGet(string $url, array $query): array
    {
        $this->ensureApiKey();

        try {
            $response = Http::timeout((int) config('google_maps.timeout_seconds', 8))
                ->get($url, [...$query, 'key' => config('google_maps.api_key')]);
        } catch (ConnectionException $exception) {
            throw new GoogleMapsException('Google Maps request could not reach '.parse_url($url, PHP_URL_HOST).'.');
        }

        $data = $this->jsonOrFail($response->status(), $response->json(), $url);
        if (($data['status'] ?? 'OK') !== 'OK') {
            throw new GoogleMapsException($data['error_message'] ?? 'Google Geocoding request failed.');
        }

        return $data;
    }

    private function jsonOrFail(int $status, mixed $data, string $url): array
    {
        if (is_array($data) && isset($data['error'])) {
            $message = $data['error']['message'] ?? 'Google Maps request failed.';
            $googleStatus = $data['error']['status'] ?? null;

            Log::warning('Google Maps API error response', [
                'host' => parse_url($url, PHP_URL_HOST),
                'status' => $status,
                'google_status' => $googleStatus,
                'message' => $message,
            ]);

            throw new GoogleMapsException('Google Maps request failed: '.$message, $status >= 400 ? 502 : 500);
        }

        if ($status >= 400 || ! is_array($data)) {
            Log::warning('Google Maps API unexpected response', [
                'host' => parse_url($url, PHP_URL_HOST),
                'status' => $status,
                'has_json_body' => is_array($data),
            ]);

            throw new GoogleMapsException('Google Maps request failed for '.parse_url($url, PHP_URL_HOST).'.', $status >= 400 ? 502 : 500);
        }

        return $data;
    }

    private function ensureApiKey(): void
    {
        if (! config('google_maps.api_key')) {
            throw new GoogleMapsException('Google Maps server API key is not configured.', 503);
        }
    }

    private function durationSeconds(string $duration): int
    {
        if (Str::endsWith($duration, 's')) {
            return max(0, (int) round((float) rtrim($duration, 's')));
        }

        return max(0, (int) round((float) $duration));
    }

    private function decodePolyline(string $encoded): array
    {
        $coordinates = [];
        $index = 0;
        $lat = 0;
        $lng = 0;
        $length = strlen($encoded);

        while ($index < $length) {
            [$deltaLat, $index] = $this->decodePolylineValue($encoded, $index);
            [$deltaLng, $index] = $this->decodePolylineValue($encoded, $index);

            $lat += $deltaLat;
            $lng += $deltaLng;

            $coordinates[] = [
                'latitude' => $lat / 1e5,
                'longitude' => $lng / 1e5,
            ];
        }

        return $coordinates;
    }

    private function decodePolylineValue(string $encoded, int $index): array
    {
        $result = 0;
        $shift = 0;

        do {
            $byte = ord($encoded[$index++]) - 63;
            $result |= ($byte & 0x1f) << $shift;
            $shift += 5;
        } while ($byte >= 0x20);

        return [($result & 1) ? ~($result >> 1) : ($result >> 1), $index];
    }

    private function placeType(array $types): string
    {
        return in_array('point_of_interest', $types, true) || in_array('establishment', $types, true)
            ? 'landmark'
            : 'address';
    }

    private function shortAddress(string $address): string
    {
        return trim(explode(',', $address)[0]) ?: 'Selected location';
    }

    private function formatDistance(int $meters): string
    {
        return $meters >= 1000 ? number_format($meters / 1000, 1).' km' : $meters.' m';
    }

    private function formatDuration(int $seconds): string
    {
        $minutes = (int) round($seconds / 60);
        if ($minutes < 1) {
            return '< 1 min';
        }

        return $minutes === 1 ? '1 min' : $minutes.' mins';
    }
}
