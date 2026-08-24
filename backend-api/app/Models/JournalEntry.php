<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class JournalEntry extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'posted_at' => 'datetime',
    ];

    public const TYPE_RIDE_SETTLEMENT = 'RIDE_SETTLEMENT';
    public const TYPE_PAYOUT_REQUEST = 'PAYOUT_REQUEST';
    public const TYPE_PAYOUT_PAID = 'PAYOUT_PAID';
    public const TYPE_TOPUP = 'TOPUP';
    public const TYPE_ADJUSTMENT = 'ADJUSTMENT';
    public const TYPE_REVERSAL = 'REVERSAL';
    public const TYPE_PASSENGER_CREDIT = 'PASSENGER_CREDIT';
    public const TYPE_LOYALTY_ACCRUAL = 'LOYALTY_ACCRUAL';
    public const TYPE_REFERRAL_BONUS_DRIVER = 'REFERRAL_BONUS_DRIVER';
    public const TYPE_REFERRAL_BONUS_LOYALTY = 'REFERRAL_BONUS_LOYALTY';

    protected static function booted(): void
    {
        // The ledger is append-only. Corrections are posted as a reversing entry
        // so the original record survives for audit.
        static::updating(function (self $entry) {
            throw new RuntimeException('Journal entries are immutable; post a reversing entry instead.');
        });

        static::deleting(function (self $entry) {
            throw new RuntimeException('Journal entries cannot be deleted; post a reversing entry instead.');
        });
    }

    public function lines()
    {
        return $this->hasMany(JournalLine::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }

    public function reverses()
    {
        return $this->belongsTo(self::class, 'reverses_entry_id');
    }
}
