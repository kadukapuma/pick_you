<?php

return [
    'api_key' => env('GOOGLE_MAPS_SERVER_API_KEY'),
    'country' => env('GOOGLE_MAPS_COUNTRY', 'lk'),
    'language' => env('GOOGLE_MAPS_LANGUAGE', 'en'),
    'region' => env('GOOGLE_MAPS_REGION', 'LK'),
    'timeout_seconds' => (int) env('GOOGLE_MAPS_TIMEOUT_SECONDS', 8),
    'route_cache_ttl_seconds' => (int) env('GOOGLE_MAPS_ROUTE_CACHE_TTL_SECONDS', 300),
    'endpoints' => [
        'places_autocomplete' => env('GOOGLE_PLACES_AUTOCOMPLETE_URL', 'https://places.googleapis.com/v1/places:autocomplete'),
        'place_details' => env('GOOGLE_PLACE_DETAILS_URL', 'https://places.googleapis.com/v1/places'),
        'geocode' => env('GOOGLE_GEOCODE_URL', 'https://maps.googleapis.com/maps/api/geocode/json'),
        'routes' => env('GOOGLE_ROUTES_URL', 'https://routes.googleapis.com/directions/v2:computeRoutes'),
    ],
];
