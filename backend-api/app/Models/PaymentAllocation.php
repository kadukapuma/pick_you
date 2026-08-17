<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentAllocation extends Model
{
    public const TYPE_PICKU_CREDIT = 'PICKU_CREDIT';
    public const TYPE_CARD = 'CARD';
    public const TYPE_CASH = 'CASH';

    public const STATUS_RESERVED = 'RESERVED';
    public const STATUS_COMPLETED = 'COMPLETED';
    public const STATUS_RELEASED = 'RELEASED';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'metadata' => 'array',
        'reserved_at' => 'datetime',
        'completed_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }
}
