<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VehicleImage extends Model
{
    protected $fillable = [
        'driver_id',
        'vehicle_id',
        'insurance_img',
        'licence_img',
        'v_front',
        'v_back',
        'v_side',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }
}
