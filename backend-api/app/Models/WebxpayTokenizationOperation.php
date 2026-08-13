<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class WebxpayTokenizationOperation extends Model
{
    use HasUuids;

    public const STATUS_INITIATED = 'INITIATED';

    public const STATUS_PROCESSING = 'PROCESSING';

    public const STATUS_THREE_DS_REQUIRED = 'THREE_DS_REQUIRED';

    public const STATUS_COMPLETED = 'COMPLETED';

    public const STATUS_FAILED = 'FAILED';

    protected $guarded = ['id'];

    protected $hidden = [
        'callback_token_hash',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function passenger()
    {
        return $this->belongsTo(Passenger::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function canAcceptSession(): bool
    {
        return $this->status === self::STATUS_INITIATED
            && ! $this->isExpired();
    }

    public function markThreeDsRequired(): void
    {
        $this->update([
            'status' => self::STATUS_THREE_DS_REQUIRED,
            'failure_code' => null,
            'failure_reason' => null,
        ]);
    }

    public function markProcessing(string $callbackTokenHash): void
    {
        $this->update([
            'status' => self::STATUS_PROCESSING,
            'callback_token_hash' => $callbackTokenHash,
            'failure_code' => null,
            'failure_reason' => null,
        ]);
    }

    public function markCompleted(): void
    {
        $this->update([
            'status' => self::STATUS_COMPLETED,
            'failure_code' => null,
            'failure_reason' => null,
            'completed_at' => $this->completed_at ?? now(),
        ]);
    }

    public function markFailed(string $code, string $reason): void
    {
        $this->update([
            'status' => self::STATUS_FAILED,
            'failure_code' => $code,
            'failure_reason' => $reason,
            'completed_at' => $this->completed_at ?? now(),
        ]);
    }
}
