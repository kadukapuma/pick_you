<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentRefund extends Model
{
    public const DESTINATION_PICKU_CREDIT = 'PICKU_CREDIT';

    public const STATUS_PENDING = 'PENDING';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_FAILED = 'FAILED';

    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'decimal:2',
        'completed_at' => 'datetime',
    ];

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(Passenger::class);
    }

    public function requestedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function walletTransaction(): BelongsTo
    {
        return $this->belongsTo(WalletTransaction::class);
    }
}
