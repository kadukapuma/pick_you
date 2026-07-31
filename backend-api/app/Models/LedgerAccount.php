<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LedgerAccount extends Model
{
    protected $guarded = ['id'];

    public const TYPE_ASSET = 'asset';
    public const TYPE_LIABILITY = 'liability';
    public const TYPE_REVENUE = 'revenue';
    public const TYPE_EQUITY = 'equity';

    /** Company-wide accounts and their types. Driver accounts are resolved dynamically. */
    public const COMPANY_ACCOUNTS = [
        'REVENUE_COMMISSION' => self::TYPE_REVENUE,
        'GATEWAY_RECEIVABLE' => self::TYPE_ASSET,
        'BANK' => self::TYPE_ASSET,
        'PAYOUT_PAYABLE' => self::TYPE_LIABILITY,
        'CASH_CLEARING' => self::TYPE_ASSET,
        'PASSENGER_WALLET_LIABILITY' => self::TYPE_LIABILITY,
        'PASSENGER_RECEIVABLE' => self::TYPE_ASSET,
    ];

    public function lines()
    {
        return $this->hasMany(JournalLine::class);
    }

    public function owner()
    {
        return $this->morphTo();
    }

    public static function codeForDriver(int $driverId): string
    {
        return "DRIVER:{$driverId}";
    }

    /**
     * Balances are stored credit-positive for every account type so that the sum
     * across all accounts is always zero. For assets that reads backwards to a
     * human, so flip the sign when displaying them.
     */
    public function naturalBalance(): string
    {
        if (in_array($this->type, [self::TYPE_ASSET], true)) {
            return bcmul((string) $this->balance, '-1', 2);
        }

        return bcadd((string) $this->balance, '0', 2);
    }
}
