<?php

return [
    'latest_ttl_seconds' => (int) env('LOCATION_LATEST_TTL_SECONDS', 60),
    'stale_after_seconds' => (int) env('LOCATION_STALE_AFTER_SECONDS', 20),
    'snapshot_interval_seconds' => (int) env('LOCATION_SNAPSHOT_INTERVAL_SECONDS', 30),
    'geo_key' => env('LOCATION_GEO_KEY', 'drivers:online:geo'),
    'queue' => env('QUEUE_LOCATIONS', 'locations'),
];
