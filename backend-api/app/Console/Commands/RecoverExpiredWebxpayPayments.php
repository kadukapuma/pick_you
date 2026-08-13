<?php

namespace App\Console\Commands;

use App\Services\Payments\WebxpayExpiredPaymentRecovery;
use Illuminate\Console\Command;

class RecoverExpiredWebxpayPayments extends Command
{
    protected $signature = 'payments:webxpay:recover-expired {--limit=100 : Maximum attempts to recover}';

    protected $description = 'Mark expired WEBXPAY attempts unknown for safe reconciliation.';

    public function handle(WebxpayExpiredPaymentRecovery $recovery): int
    {
        $limit = filter_var(
            $this->option('limit'),
            FILTER_VALIDATE_INT,
            ['options' => ['min_range' => 1, 'max_range' => 1000]]
        );

        if ($limit === false) {
            $this->error('The --limit option must be an integer from 1 to 1000.');

            return self::INVALID;
        }

        $recovered = $recovery->recoverExpired($limit);

        $this->info("Recovered {$recovered} expired WEBXPAY payment attempt(s).");

        return self::SUCCESS;
    }
}
