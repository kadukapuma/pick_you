<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        $authorizedRole = $user
            ? collect($roles)->first(fn (string $role) => $user->canActAs($role))
            : null;

        if (! $authorizedRole) {
            return new JsonResponse([
                'status' => 'error',
                'message' => 'You are not authorized to perform this action.',
            ], 403);
        }

        $accessToken = $user->currentAccessToken();
        $abilities = $accessToken instanceof PersonalAccessToken ? ($accessToken->abilities ?? []) : [];
        if (in_array('*', $abilities, true) && ! in_array('role:'.$authorizedRole, $abilities, true)) {
            Log::notice('Legacy wildcard token used for role authorization.', [
                'user_id' => $user->id,
                'role' => $authorizedRole,
            ]);
        }

        return $next($request);
    }
}
