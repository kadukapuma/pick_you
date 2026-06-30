<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideLocationPoint extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'accuracy' => 'float',
        'speed' => 'float',
        'heading' => 'float',
        'recorded_at' => 'datetime',
        'sequence' => 'integer',
        'distance_from_previous_km' => 'float',
        'accepted_for_fare' => 'boolean',
    ];

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
