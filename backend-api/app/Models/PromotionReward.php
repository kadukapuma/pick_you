<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PromotionReward extends Model
{
    public const TYPE_DRIVER_CREDIT = 'driver_credit';
    public const TYPE_LOYALTY_POINTS = 'loyalty_points';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    public function referrer()
    {
        return $this->belongsTo(User::class, 'referrer_user_id');
    }

    public function referredUser()
    {
        return $this->belongsTo(User::class, 'referred_user_id');
    }

    public function journalEntry()
    {
        return $this->belongsTo(JournalEntry::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
