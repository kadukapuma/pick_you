<?php

namespace App\Console\Commands;

use App\Models\OtpVerification;
use Illuminate\Console\Command;

class PruneExpiredOtpVerifications extends Command
{
    protected $signature = 'otp:prune-expired {--hours=24 : Keep expired OTP rows for this many hours before deleting}';

    protected $description = 'Delete old expired OTP verification records.';

    public function handle(): int
    {
        $cutoff = now()->subHours((int) $this->option('hours'));

        $deleted = OtpVerification::query()
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', $cutoff)
            ->delete();

        $this->info("Deleted {$deleted} expired OTP verification records.");

        return self::SUCCESS;
    }
}
