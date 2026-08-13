<?php

use App\Http\Middleware\CacheSanctumToken;
use App\Http\Middleware\CheckAdmin;
use App\Http\Middleware\CheckPermission;
use App\Http\Middleware\EnsureIdempotentRequest;
use App\Http\Middleware\EnsureUserRole;
use App\Http\Middleware\SuperAdminMiddleware;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['api', 'auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'admin' => CheckAdmin::class,
            'permission' => CheckPermission::class,
            'super_admin' => SuperAdminMiddleware::class,
            'role' => EnsureUserRole::class,
            'idempotent' => EnsureIdempotentRequest::class,
            'cache.sanctum' => CacheSanctumToken::class,
        ]);
        $middleware->api(prepend: [
            CacheSanctumToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->booted(function (): void {
        RateLimiter::for('auth', function (Request $request) {
            $identity = $request->input('email')
                ?? $request->input('phone')
                ?? $request->input('enrollment_token')
                ?? $request->ip();

            return Limit::perMinute((int) config('auth.auth_rate_limit_per_minute', 10))
                ->by($request->ip().'|'.sha1((string) $identity));
        });

        RateLimiter::for('webxpay-saved-card-payment', function (Request $request) {
            $identity = $request->user()?->getAuthIdentifier() ?? $request->ip();

            return Limit::perMinute(5)
                ->by('webxpay-saved-card-payment|'.$identity);
        });
    })
    ->create();
