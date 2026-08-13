<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Notification Queue
    |--------------------------------------------------------------------------
    |
    | Push sends run on their own queue so a spike in ride notifications
    | can never starve ride-matching or location-tracking jobs. Run a
    | dedicated worker for this queue, e.g. `queue:work redis --queue=notifications`.
    |
    */

    'queue' => env('NOTIFICATIONS_QUEUE', 'notifications'),

];
