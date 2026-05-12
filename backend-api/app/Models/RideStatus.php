<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideStatus extends Model
{
    protected $guarded = ['id'];

    //

    public function ride() { return $this->belongsTo(Ride::class); }
}
