<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $guarded = ['id'];

    //

    public function ridePromotions() { return $this->hasMany(RidePromotion::class); }
}
