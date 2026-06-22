<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class OperatorController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->integer('per_page', 10);
        if ($perPage < 1) {
            $perPage = 10;
        }
        $perPage = min($perPage, 100);

        $operators = User::where('role', User::ROLE_OPERATOR)
            ->with('rolePermissions')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $operators,
        ]);
    }

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
            'role' => User::ROLE_OPERATOR,
            'is_active' => true,
            'is_verified' => true,
        ])->load('rolePermissions');

        return response()->json([
            'status' => 'success',
            'message' => 'Operator created successfully',
            'data' => $user,
        ], 201);
    }

    public function update(Request $request, string $id)
    {
        $operator = User::where('role', User::ROLE_OPERATOR)->with('rolePermissions')->findOrFail($id);

        $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email,' . $operator->id],
            'phone' => ['sometimes', 'required', 'string', 'max:20', 'unique:users,phone,' . $operator->id],
        ]);

        $operator->update($request->only(['first_name', 'last_name', 'email', 'phone']));

        return response()->json([
            'status' => 'success',
            'message' => 'Operator updated successfully',
            'data' => $operator->fresh()->load('rolePermissions'),
        ]);
    }

    public function updateStatus(Request $request, string $id)
    {
        $operator = User::where('role', User::ROLE_OPERATOR)->with('rolePermissions')->findOrFail($id);

        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $operator->update(['is_active' => $request->is_active]);

        return response()->json([
            'status' => 'success',
            'message' => 'Operator status updated successfully',
            'data' => $operator->fresh()->load('rolePermissions'),
        ]);
    }

    public function destroy(string $id)
    {
        $operator = User::where('role', User::ROLE_OPERATOR)->with('rolePermissions')->findOrFail($id);
        $operator->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Operator deleted successfully',
        ]);
    }
}
