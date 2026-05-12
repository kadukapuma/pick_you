<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FareConfig extends Model
{
    protected $guarded = ['id'];

    //

    public function rides() { return $this->hasMany(Ride::class, 'fare_id'); }
}
