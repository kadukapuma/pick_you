<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyPointTransaction extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'passenger_id',
        'ride_id',
        'points',
        'created_at',
    ];

    protected $casts = [
        'points' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }
}
