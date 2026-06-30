<?php

namespace App\Services\Ratings;

use App\Models\Driver;
use App\Models\Rating;

class DriverRatingService
{
    public function refreshAverage(Driver $driver): float
    {
        $average = Rating::where('driver_id', $driver->id)->avg('rating');
        $rating = round((float) ($average ?? 0), 2);

        $driver->forceFill(['rating' => $rating])->save();

        return $rating;
    }
}
