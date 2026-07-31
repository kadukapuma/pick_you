<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PassengerPaymentMethod extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['token'];

    protected $casts = [
        'is_default' => 'boolean',
        'exp_month' => 'integer',
        'exp_year' => 'integer',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function isExpired(): bool
    {
        $now = now();

        return $this->exp_year < $now->year
            || ($this->exp_year === $now->year && $this->exp_month < $now->month);
    }
}
