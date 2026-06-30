<?php

namespace App\Services\Auth;

use App\Models\User;

class AuthPayload
{
    public function for(User $user, string $activeRole, ?string $token = null): array
    {
        $user->loadMissing(['passenger', 'driver.vehicles', 'roles']);
        $serialized = $user->toArray();
        $serialized['role'] = $activeRole;
        $serialized['roles'] = $user->activeRoles();
        $serialized['active_role'] = $activeRole;

        $payload = [
            'user' => $serialized,
            'roles' => $serialized['roles'],
            'active_role' => $activeRole,
        ];
        if ($token !== null) {
            $payload['token'] = $token;
        }

        return $payload;
    }
}
