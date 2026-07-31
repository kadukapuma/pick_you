<?php

namespace App\Services\Ledger;

use DomainException;

class UnbalancedEntryException extends DomainException
{
    public static function forTotals(string $debits, string $credits): self
    {
        return new self("Journal entry does not balance: debits {$debits} != credits {$credits}.");
    }
}
