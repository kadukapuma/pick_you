<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentVerification extends Model
{
    protected $fillable = [
        'passenger_id',
        'university_name',
        'card_front_path',
        'card_back_path',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }
}
