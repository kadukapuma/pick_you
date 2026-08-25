<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Passenger extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'nic',
        'profile_image',
        'wallet_balance',
        'wallet_reserved_balance',
        'loyalty_points_balance',
        'loyalty_points_reserved_balance',
    ];

    protected $casts = [
        'wallet_balance' => 'decimal:2',
        'wallet_reserved_balance' => 'decimal:2',
        'loyalty_points_balance' => 'decimal:2',
        'loyalty_points_reserved_balance' => 'decimal:2',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function rides()
    {
        return $this->hasMany(Ride::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function studentVerification()
    {
        return $this->hasOne(StudentVerification::class);
    }

    public function loyaltyPointTransactions()
    {
        return $this->hasMany(LoyaltyPointTransaction::class);
    }

    public function isVerifiedStudent(): bool
    {
        return $this->studentVerification?->status === 'approved';
    }
}
