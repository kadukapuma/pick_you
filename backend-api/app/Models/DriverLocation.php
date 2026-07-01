<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverLocation extends Model
{
    protected $guarded = ['id'];

    // Append these virtual attributes to JSON responses
    protected $appends = ['latitude', 'longitude'];

    protected $casts = [
        'recorded_at' => 'datetime',
        'sequence' => 'integer',
    ];

    public function driver() 
    { 
        return $this->belongsTo(Driver::class); 
    }

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }

    /**
     * Accessor for Latitude
     */
    public function getLatitudeAttribute()
    {
        $rawLatitude = $this->getRawOriginal('latitude');
        if ($rawLatitude !== null) {
            return (float) $rawLatitude;
        }

        if ($this->location && is_string($this->location)) {
            // PostgreSQL point format is "(lng,lat)"
            $coords = str_replace(['(', ')'], '', $this->location);
            return (float) explode(',', $coords)[1];
        }
        return null;
    }

    /**
     * Accessor for Longitude
     */
    public function getLongitudeAttribute()
    {
        $rawLongitude = $this->getRawOriginal('longitude');
        if ($rawLongitude !== null) {
            return (float) $rawLongitude;
        }

        if ($this->location && is_string($this->location)) {
            $coords = str_replace(['(', ')'], '', $this->location);
            return (float) explode(',', $coords)[0];
        }
        return null;
    }
}
