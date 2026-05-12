<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminNotificationLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class AdminController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $admins = User::where('role', User::ROLE_ADMIN)
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $admins
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:' . User::class],
            'phone' => ['required', 'string', 'max:20', 'unique:' . User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone' => $request->phone,
            'password' => Hash::make($request->password),
            'role' => User::ROLE_ADMIN,
        ]);

        $adminName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
        if ($adminName === '') {
            $adminName = "Admin #{$user->id}";
        }

        AdminNotificationLog::createAndBroadcast(
            'admin',
            'New admin added',
            "{$adminName} was added as admin.",
            ['admin_id' => $user->id]
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Admin created successfully',
            'data' => $user
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $admin
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);

        $request->validate([
            'first_name' => ['string', 'max:255'],
            'last_name' => ['string', 'max:255'],
            'email' => ['string', 'lowercase', 'email', 'max:255', 'unique:users,email,' . $admin->id],
            'phone' => ['string', 'max:20', 'unique:users,phone,' . $admin->id],
        ]);

        $admin->update($request->only(['first_name', 'last_name', 'email', 'phone']));

        return response()->json([
            'status' => 'success',
            'message' => 'Admin updated successfully',
            'data' => $admin
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);
        $admin->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Admin deleted successfully'
        ]);
    }

    /**
     * Toggle the active status of an admin.
     */
    public function updateStatus(Request $request, string $id)
    {
        $admin = User::where('role', User::ROLE_ADMIN)->findOrFail($id);

        $request->validate([
            'is_active' => 'required|boolean'
        ]);

        $admin->update(['is_active' => $request->is_active]);

        return response()->json([
            'status' => 'success',
            'message' => 'Admin status updated successfully',
            'data' => $admin
        ]);
    }
}
