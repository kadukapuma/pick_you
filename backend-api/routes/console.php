<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('otp:prune-expired')->hourly();
Schedule::command('idempotency:prune-expired')->hourly();
Schedule::command('drivers:prune-stale-online')->everyFiveMinutes();
Schedule::command('notifications:prune-invalid-tokens')->hourly();
Schedule::command('payments:webxpay:recover-expired --limit=100')
    ->everyMinute()
    ->withoutOverlapping();
