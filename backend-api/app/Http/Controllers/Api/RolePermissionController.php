<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RolePermission;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolePermissionController extends Controller
{
    public function index()
    {
        $roles = collect(User::manageableRoles())
            ->map(function (string $role) {
                return [
                    'role' => $role,
                    'label' => ucfirst(str_replace('_', ' ', $role)),
                    'permissions' => RolePermission::where('role', $role)
                        ->orderBy('permission')
                        ->pluck('permission')
                        ->values()
                        ->all(),
                ];
            })
            ->prepend([
                'role' => User::ROLE_SUPER_ADMIN,
                'label' => 'Super Admin',
                'permissions' => User::availablePermissions(),
                'locked' => true,
            ])
            ->values();

        return response()->json([
            'status' => 'success',
            'data' => [
                'roles' => $roles,
                'available_permissions' => User::availablePermissions(),
            ],
        ]);
    }

    public function update(Request $request, string $role)
    {
        $request->validate([
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::in(User::availablePermissions())],
        ]);

        if (! in_array($role, User::manageableRoles(), true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'This role cannot be modified.'
            ], 422);
        }

        $permissions = array_values(array_unique($request->input('permissions', [])));

        RolePermission::where('role', $role)->delete();

        foreach ($permissions as $permission) {
            RolePermission::create([
                'role' => $role,
                'permission' => $permission,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Role permissions updated successfully',
            'data' => [
                'role' => $role,
                'permissions' => $permissions,
            ],
        ]);
    }
}
