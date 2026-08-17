<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebxpayTokenPaymentOperation extends Model
{
    public const STATUS_PROCESSING = 'PROCESSING';

    public const STATUS_THREE_DS_REQUIRED = 'THREE_DS_REQUIRED';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_FAILED = 'FAILED';

    protected $guarded = ['id'];

    protected $hidden = ['callback_token_hash'];

    protected $casts = [
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function passenger(): BelongsTo
    {
        return $this->belongsTo(Passenger::class);
    }

    public function paymentMethod(): BelongsTo
    {
        return $this->belongsTo(
            PassengerPaymentMethod::class,
            'passenger_payment_method_id'
        );
    }

    public function paymentAttempt(): BelongsTo
    {
        return $this->belongsTo(PaymentAttempt::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function markThreeDsRequired(): void
    {
        $this->update(['status' => self::STATUS_THREE_DS_REQUIRED]);
    }

    public function markCompleted(): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'failure_code' => null,
            'failure_reason' => null,
            'completed_at' => now(),
        ]);
    }

    public function markFailed(string $code, string $reason): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'failure_code' => $code,
            'failure_reason' => $reason,
            'completed_at' => now(),
        ]);
    }
}
