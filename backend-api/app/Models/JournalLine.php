<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use RuntimeException;

class JournalLine extends Model
{
    protected $guarded = ['id'];

    protected static function booted(): void
    {
        static::updating(function (self $line) {
            throw new RuntimeException('Journal lines are immutable; post a reversing entry instead.');
        });

        static::deleting(function (self $line) {
            throw new RuntimeException('Journal lines cannot be deleted; post a reversing entry instead.');
        });
    }

    public function entry()
    {
        return $this->belongsTo(JournalEntry::class, 'journal_entry_id');
    }

    public function account()
    {
        return $this->belongsTo(LedgerAccount::class, 'ledger_account_id');
    }
}
