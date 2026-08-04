<?php

/**
 * Commission/ledger deployment check.
 *
 * Run on the server from the backend-api directory:
 *     php diagnose_commission.php
 *
 * Safe to run on production: it only reads. Delete the file afterwards.
 */

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$ok = fn (string $m) => print("  [ OK ]   {$m}\n");
$bad = fn (string $m) => print("  [FAIL]   {$m}\n");
$info = fn (string $m) => print("  [info]   {$m}\n");

echo "\n=== PickU commission deployment check ===\n\n";

echo "Environment\n";
$info('APP_ENV       : '.config('app.env'));
$info('APP_DEBUG     : '.var_export(config('app.debug'), true));
$info('DB connection : '.config('database.default'));

echo "\nPHP extensions\n";
extension_loaded('bcmath')
    ? $ok('bcmath is installed')
    : $bad('bcmath is MISSING - every ledger call will fatal. Install php-bcmath and restart php-fpm.');

echo "\nConfig files\n";
config()->has('commission.default_rate')
    ? $ok('config/commission.php loaded (rate '.config('commission.default_rate').')')
    : $bad('config/commission.php NOT loaded - upload it, then run: php artisan config:clear');

config()->has('payments.driver')
    ? $ok('config/payments.php loaded (driver: '.config('payments.driver').')')
    : $bad('config/payments.php NOT loaded - upload it, then run: php artisan config:clear');

if (config('app.env') === 'production' && config('payments.driver') === 'mock') {
    if (config('payments.allow_mock_in_production')) {
        $info('payments.driver is "mock" in production, explicitly allowed.');
        $info('  -> Card payments are SIMULATED. Drivers are being credited for money');
        $info('     that was never collected. Do NOT run payouts while this is on.');
        $info("  -> Find them later with: select * from journal_entries where gateway = 'mock';");
    } else {
        $bad('payments.driver is "mock" in production. Card payments will fail by design.');
        $info('  -> Cash payments are unaffected and work normally.');
        $info('  -> To demo the simulated card flow, set PAYMENTS_ALLOW_MOCK_IN_PRODUCTION=true');
    }
}

echo "\nDatabase tables\n";
foreach ([
    'ledger_accounts', 'journal_entries', 'journal_lines',
    'driver_accounts', 'passenger_payment_methods',
] as $table) {
    Illuminate\Support\Facades\Schema::hasTable($table)
        ? $ok("table {$table} exists")
        : $bad("table {$table} is MISSING - run: php artisan migrate --force");
}

echo "\nNew columns\n";
foreach ([
    'rides' => ['payment_method', 'commission_rate', 'commission_amount', 'driver_earning'],
    'payments' => ['gateway', 'gateway_reference', 'failure_reason'],
    'fare_configs' => ['commission_rate'],
] as $table => $columns) {
    foreach ($columns as $column) {
        Illuminate\Support\Facades\Schema::hasColumn($table, $column)
            ? $ok("{$table}.{$column}")
            : $bad("{$table}.{$column} is MISSING - run: php artisan migrate --force");
    }
}

echo "\nRoutes\n";
$routes = collect(Illuminate\Support\Facades\Route::getRoutes())
    ->map(fn ($r) => $r->uri())
    ->all();

foreach (['api/driver/account', 'api/driver/earnings/summary', 'api/admin/finance/summary'] as $uri) {
    in_array($uri, $routes, true)
        ? $ok("route {$uri} registered")
        : $bad("route {$uri} NOT registered - run: php artisan route:clear");
}

echo "\nClasses (a missing upload shows up here)\n";
foreach ([
    App\Services\Ledger\Money::class,
    App\Services\Ledger\LedgerService::class,
    App\Services\Ledger\CommissionService::class,
    App\Services\Ledger\RideSettlementService::class,
    App\Services\Ledger\UnbalancedEntryException::class,
    App\Services\Payments\PaymentGateway::class,
    App\Services\Payments\MockPaymentGateway::class,
    App\Services\Payments\GatewayResult::class,
    App\Providers\PaymentGatewayServiceProvider::class,
    App\Models\LedgerAccount::class,
    App\Models\JournalEntry::class,
    App\Models\JournalLine::class,
    App\Models\DriverAccount::class,
    App\Models\PassengerPaymentMethod::class,
    App\Http\Controllers\Api\AdminFinanceController::class,
    App\Http\Controllers\Api\DriverAccountController::class,
    App\Http\Controllers\Api\PassengerPaymentMethodController::class,
] as $class) {
    (class_exists($class) || interface_exists($class))
        ? $ok($class)
        : $bad("{$class} NOT FOUND - file missing on the server, or run: composer dump-autoload");
}

echo "\nEndpoint logic (this is what is actually 500ing)\n";

try {
    $probe = App\Services\Ledger\Money::of('1000.00');
    $ok("Money::of() works ({$probe})");
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (Money): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

try {
    $controller = app(App\Http\Controllers\Api\AdminFinanceController::class);
    $response = $controller->summary(new Illuminate\Http\Request(['period' => 'month']));
    $ok('admin/finance/summary returned HTTP '.$response->status());
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (summary): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

try {
    $controller = app(App\Http\Controllers\Api\AdminFinanceController::class);
    $response = $controller->driverAccounts(new Illuminate\Http\Request(['filter' => 'all']));
    $ok('admin/finance/driver-accounts returned HTTP '.$response->status());
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (driver-accounts): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

echo "\nLive query (what the earnings screen actually does)\n";
try {
    $driver = App\Models\Driver::query()->first();

    if (! $driver) {
        $info('No drivers in the database yet - skipping.');
    } else {
        $account = App\Models\DriverAccount::forDriver((int) $driver->id);
        $ok("driver #{$driver->id} account resolved, balance ".$account->balance());

        $summary = App\Models\Ride::query()
            ->where('driver_id', $driver->id)
            ->where('status', 'COMPLETED')
            ->count();
        $ok("completed rides for that driver: {$summary}");
    }
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR: '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

echo "\nPayment confirmation (the cash-confirm 500)\n";

// "Server Error" with no "status" key means the exception escaped the
// controller's own try/catch - which points at construction, not at the
// payment logic. Building the controller here reproduces that directly.
try {
    app(App\Http\Controllers\Api\PaymentController::class);
    $ok('PaymentController constructs (all ledger dependencies resolve)');
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (controller construction): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
    $info('  -> Usually a stale optimized autoloader. Run: composer dump-autoload -o');
}

try {
    app(App\Services\Ledger\RideSettlementService::class);
    $ok('RideSettlementService resolves');
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (settlement service): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

// Settle a throwaway ride end to end, then roll it back so the books are
// untouched. This exercises the exact path that 500s on cash confirmation.
try {
    Illuminate\Support\Facades\DB::beginTransaction();

    $ride = App\Models\Ride::query()
        ->whereNotNull('driver_id')
        ->where('status', 'COMPLETED')
        ->latest('completed_at')
        ->first();

    if (! $ride) {
        $info('No completed ride with a driver to test against - skipping.');
        Illuminate\Support\Facades\DB::rollBack();
    } else {
        App\Models\Payment::where('ride_id', $ride->id)->delete();

        $payment = App\Models\Payment::create([
            'ride_id' => $ride->id,
            'passenger_id' => $ride->passenger_id,
            'payment_method' => 'cash',
            'amount' => (float) $ride->final_fare > 0 ? $ride->final_fare : $ride->estimated_fare,
            'transaction_id' => 'txn_diagnostic',
            'payment_status' => 'COMPLETED',
            'paid_at' => now(),
        ]);

        app(App\Services\Ledger\RideSettlementService::class)->settle($payment);
        $ok("settlement succeeded for ride #{$ride->id} (rolled back, nothing saved)");

        Illuminate\Support\Facades\DB::rollBack();
    }
} catch (Throwable $e) {
    Illuminate\Support\Facades\DB::rollBack();
    $bad('THIS IS YOUR ERROR (settlement): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());
}

echo "\nCard save (the 'Server Error' on Add new card)\n";

// This is the actual failure point: PassengerPaymentMethodController::store()
// resolves the gateway lazily too, but on a misconfigured server it throws
// before ever reaching a passenger or a database row.
try {
    $gateway = app(App\Services\Payments\PaymentGateway::class);
    $ok('Payment gateway resolves: '.get_class($gateway));

    $result = $gateway->tokenizeCard([
        'number' => App\Services\Payments\MockPaymentGateway::CARD_SUCCESS,
        'exp_month' => 12,
        'exp_year' => (int) date('Y') + 1,
        'cvv' => '123',
    ]);

    $result->successful
        ? $ok('tokenizeCard() succeeds - card save should work from the app now')
        : $bad('tokenizeCard() returned a decline: '.$result->failureReason);
} catch (Throwable $e) {
    $bad('THIS IS YOUR ERROR (card save): '.get_class($e).': '.$e->getMessage());
    $info('at '.$e->getFile().':'.$e->getLine());

    if (str_contains($e->getMessage(), 'mock')) {
        $info('  -> This is the mock gateway refusing to run in production.');
        $info('  -> Add to .env: PAYMENTS_ALLOW_MOCK_IN_PRODUCTION=true');
        $info('  -> Then:        php artisan config:clear && restart php-fpm');
        $info('  -> This simulates card capture; do not run driver payouts while it is on.');
    }
}

echo "\nRecent errors from the log\n";
$log = storage_path('logs/laravel.log');

if (! is_readable($log)) {
    $info('storage/logs/laravel.log not readable.');
} else {
    $lines = array_slice(file($log) ?: [], -400);
    $hits = array_values(array_filter(
        $lines,
        fn ($l) => str_contains($l, 'production.ERROR') || str_contains($l, 'local.ERROR'),
    ));

    if ($hits === []) {
        $info('No recent ERROR lines found.');
    } else {
        foreach (array_slice($hits, -5) as $line) {
            echo '  '.trim(substr($line, 0, 400))."\n";
        }
    }
}

echo "\nDone.\n\n";
