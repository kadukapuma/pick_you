<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PendingDriverEnrollment extends Model
{
    protected $fillable = [
        'token_hash', 'phone_normalized', 'first_name', 'last_name',
        'login_email', 'password', 'expires_at', 'consumed_at',
    ];

    protected $hidden = ['token_hash', 'password'];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'consumed_at' => 'datetime',
        ];
    }
}
