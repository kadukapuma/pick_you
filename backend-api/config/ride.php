<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Driver offer window (seconds)
    |--------------------------------------------------------------------------
    |
    | How long one driver sees a ride before the system offers it to the
    | next nearest driver in the Redis queue.
    |
    */
    'driver_offer_seconds' => (int) env('RIDE_DRIVER_OFFER_SECONDS', 12),

    /*
    |--------------------------------------------------------------------------
    | Driver matching radius (kilometers)
    |--------------------------------------------------------------------------
    |
    | Only drivers within this radius of the pickup point are considered.
    |
    */
    'match_radius_km' => (float) env('RIDE_MATCH_RADIUS_KM', 10),

    /*
    |--------------------------------------------------------------------------
    | Maximum drivers in matching queue
    |--------------------------------------------------------------------------
    |
    | Caps how many nearest drivers are pushed into the Redis matching list.
    |
    */
    'match_max_drivers' => (int) env('RIDE_MATCH_MAX_DRIVERS', 50),

    /*
    |--------------------------------------------------------------------------
    | Rejection cooldown (seconds)
    |--------------------------------------------------------------------------
    |
    | After rejecting a ride, a driver will not receive new nearby offers
    | for this duration.
    |
    */
    'rejection_cooldown_seconds' => (int) env('RIDE_REJECTION_COOLDOWN_SECONDS', 300),

    /*
    |--------------------------------------------------------------------------
    | Queue names
    |--------------------------------------------------------------------------
    */
    'queues' => [
        'rides' => env('QUEUE_RIDES', 'rides'),
        'notifications' => env('QUEUE_NOTIFICATIONS', 'notifications'),
        'default' => env('REDIS_QUEUE', 'default'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Redis TTL (seconds) for ride-matching keys
    |--------------------------------------------------------------------------
    */
    'redis' => [
        'matching_drivers_ttl' => (int) env(
            'RIDE_REDIS_MATCHING_TTL',
            ((int) env('RIDE_DRIVER_OFFER_SECONDS', 12)) * ((int) env('RIDE_MATCH_MAX_DRIVERS', 50)) + 120
        ),
        'current_driver_ttl' => (int) env(
            'RIDE_REDIS_CURRENT_DRIVER_TTL',
            ((int) env('RIDE_DRIVER_OFFER_SECONDS', 12)) + 30
        ),
    ],

];
