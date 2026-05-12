<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    protected $guarded = ['id'];

    //

    public function ride() { return $this->belongsTo(Ride::class); }
    public function passenger() { return $this->belongsTo(Passenger::class); }
    public function driver() { return $this->belongsTo(Driver::class); }
}
