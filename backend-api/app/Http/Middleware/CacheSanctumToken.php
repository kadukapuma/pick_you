<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Laravel\Sanctum\PersonalAccessToken;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class CacheSanctumToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $bearerToken = $request->bearerToken();

        if ($bearerToken) {
            $cacheKey = 'sanctum_token:' . hash('sha256', $bearerToken);
            $ttl = (int) config('sanctum.cache_ttl_seconds', 300);

            try {
                $user = Cache::remember($cacheKey, $ttl, function () use ($bearerToken) {
                    $tokenModel = PersonalAccessToken::findToken($bearerToken);
                    if (! $tokenModel) {
                        return null;
                    }

                    $user = $tokenModel->tokenable;
                    if ($user) {
                        $user->withAccessToken($tokenModel);
                    }

                    return $user;
                });

                if ($user) {
                    Auth::setUser($user);
                    if (Auth::hasUser()) {
                        Auth::guard('sanctum')->setUser($user);
                    }
                }
            } catch (Throwable) {
                // If Redis/Cache fails, fall back to standard Sanctum database lookup
            }
        }

        return $next($request);
    }
}
