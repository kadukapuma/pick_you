<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DriverCredential extends Model
{
    protected $fillable = ['driver_id', 'login_email', 'password'];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return ['password' => 'hashed'];
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }
}
