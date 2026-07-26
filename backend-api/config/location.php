<?php

return [
    'latest_ttl_seconds' => (int) env('LOCATION_LATEST_TTL_SECONDS', 60),
    'stale_after_seconds' => (int) env('LOCATION_STALE_AFTER_SECONDS', 20),
    'snapshot_interval_seconds' => (int) env('LOCATION_SNAPSHOT_INTERVAL_SECONDS', 30),
    'max_fare_accuracy_meters' => (float) env('LOCATION_MAX_FARE_ACCURACY_METERS', 100),
    'max_point_jump_km' => (float) env('LOCATION_MAX_POINT_JUMP_KM', 3),
    'max_plausible_speed_kmh' => (float) env('LOCATION_MAX_PLAUSIBLE_SPEED_KMH', 160),
    'geo_key' => env('LOCATION_GEO_KEY', 'drivers:online:geo'),
    'queue' => env('QUEUE_LOCATIONS', 'locations'),
];
