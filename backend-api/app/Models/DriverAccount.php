<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class DriverAccount extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_blocked' => 'boolean',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function ledgerAccount()
    {
        return $this->belongsTo(LedgerAccount::class);
    }

    /**
     * Get (or lazily create) the account and its backing ledger account.
     */
    public static function forDriver(int $driverId): self
    {
        $existing = static::query()->where('driver_id', $driverId)->first();

        if ($existing) {
            return $existing;
        }

        return DB::transaction(function () use ($driverId) {
            // Re-check inside the transaction: two concurrent first rides for the
            // same driver would otherwise both try to create the account.
            $existing = static::query()->where('driver_id', $driverId)->lockForUpdate()->first();

            if ($existing) {
                return $existing;
            }

            $ledgerAccount = LedgerAccount::query()->firstOrCreate(
                ['code' => LedgerAccount::codeForDriver($driverId)],
                [
                    'type' => LedgerAccount::TYPE_LIABILITY,
                    'owner_type' => Driver::class,
                    'owner_id' => $driverId,
                    'balance' => 0,
                ],
            );

            return static::query()->create([
                'driver_id' => $driverId,
                'ledger_account_id' => $ledgerAccount->id,
                'credit_limit' => (string) config('commission.default_credit_limit', -2000),
            ]);
        });
    }

    /** Signed net position: positive means PickU owes the driver. */
    public function balance(): string
    {
        return bcadd((string) $this->ledgerAccount->balance, '0', 2);
    }

    public function isOverCreditLimit(): bool
    {
        return bccomp($this->balance(), (string) $this->credit_limit, 2) < 0;
    }

    public function canAcceptRides(): bool
    {
        return ! $this->is_blocked && ! $this->isOverCreditLimit();
    }
}
