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

];
