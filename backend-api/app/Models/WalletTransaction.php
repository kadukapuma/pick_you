<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    public const TYPE_CREDIT_AWARD = 'CREDIT_AWARD';
    public const TYPE_CREDIT_RESERVATION = 'CREDIT_RESERVATION';
    public const TYPE_CREDIT_CONSUMED = 'CREDIT_CONSUMED';
    public const TYPE_CREDIT_RELEASED = 'CREDIT_RELEASED';
    public const TYPE_RIDE_DEBIT = 'RIDE_DEBIT';

    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_RESERVED = 'RESERVED';
    public const STATUS_RELEASED = 'RELEASED';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'balance_after' => 'decimal:2',
        'metadata' => 'array',
        'expires_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ride(): BelongsTo
    {
        return $this->belongsTo(Ride::class);
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
