<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushTicket extends Model
{
    protected $guarded = ['id'];

    public function deviceToken()
    {
        return $this->belongsTo(DeviceToken::class);
    }
}
