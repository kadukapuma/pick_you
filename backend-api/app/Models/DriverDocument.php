<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverDocument extends Model
{
    protected $guarded = ['id'];

    //

    public function driver() { return $this->belongsTo(Driver::class); }
}
