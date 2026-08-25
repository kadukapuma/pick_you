<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoyaltyPointTransaction extends Model
{
    public $timestamps = false;

    public const TYPE_EARNED = 'earned';
    public const TYPE_REDEEMED = 'redeemed';
    public const TYPE_REFUNDED = 'refunded';

    // Which accrual rule produced an 'earned' row. Null for redeemed/refunded
    // rows - a redemption isn't "sourced" from a rate.
    public const SOURCE_STUDENT_BONUS = 'student_bonus';
    public const SOURCE_GENERAL_ACCRUAL = 'general_accrual';
    public const SOURCE_REFERRAL_BONUS = 'referral_bonus';

    protected $fillable = [
        'passenger_id',
        'ride_id',
        'payment_id',
        'points',
        'type',
        'source',
        'reference',
        'created_at',
    ];

    protected $casts = [
        'points' => 'decimal:2',
        'created_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function ride()
    {
        return $this->belongsTo(Ride::class);
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class);
    }
}
