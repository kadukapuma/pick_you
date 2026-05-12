<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverLocation extends Model
{
    protected $guarded = ['id'];

    // Append these virtual attributes to JSON responses
    protected $appends = ['latitude', 'longitude'];

    public function driver() 
    { 
        return $this->belongsTo(Driver::class); 
    }

    /**
     * Accessor for Latitude
     */
    public function getLatitudeAttribute()
    {
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
        if ($this->location && is_string($this->location)) {
            $coords = str_replace(['(', ')'], '', $this->location);
            return (float) explode(',', $coords)[0];
        }
        return null;
    }
}
