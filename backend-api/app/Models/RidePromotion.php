<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RidePromotion extends Model
{
    protected $guarded = ['id'];

    //

    public function ride() { return $this->belongsTo(Ride::class); }
    public function promotion() { return $this->belongsTo(Promotion::class); }
}
