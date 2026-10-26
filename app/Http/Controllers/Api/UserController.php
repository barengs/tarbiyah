<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Daftar user beserta roles.
     */
    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($role = $request->query('role')) {
            $query->whereHas('roles', function ($q) use ($role) {
                $q->where('name', $role);
            });
        }

        $perPage = min((int) ($request->query('per_page', 15)), 100);
        $users = $query->orderBy('name')->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data'   => $users,
        ]);
    }

    /**
     * Tambah user baru secara lokal.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role'     => 'nullable|string|exists:roles,name',
            'roles'    => 'nullable|array',
            'roles.*'  => 'string|exists:roles,name',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role'     => $validated['role'] ?? ($validated['roles'][0] ?? 'staf'),
        ]);

        $rolesToSync = $validated['roles'] ?? (isset($validated['role']) ? [$validated['role']] : ['staf']);
        $user->syncRoles($rolesToSync);

        return response()->json([
            'status'  => 'success',
            'message' => 'User berhasil ditambahkan.',
            'data'    => $user->load('roles'),
        ], 201);
    }

    /**
     * Detail user.
     */
    public function show($id)
    {
        $user = User::with(['roles.permissions', 'permissions'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $user,
        ]);
    }

    /**
     * Update user.
     */
    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'role'     => 'nullable|string|exists:roles,name',
            'roles'    => 'nullable|array',
            'roles.*'  => 'string|exists:roles,name',
        ]);

        $updateData = [
            'name'  => $validated['name'],
            'email' => $validated['email'],
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        if (isset($validated['role'])) {
            $updateData['role'] = $validated['role'];
        }

        $user->update($updateData);

        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
            if (empty($validated['role']) && !empty($validated['roles'])) {
                $user->update(['role' => $validated['roles'][0]]);
            }
        } elseif (isset($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'User berhasil diperbarui.',
            'data'    => $user->load('roles'),
        ]);
    }

    /**
     * Hapus user.
     */
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $currentUserId = auth('api')->id();

        if ($user->id == $currentUserId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Anda tidak dapat menghapus akun Anda sendiri.',
            ], 403);
        }

        if ($user->email === 'superadmin@tarbiyah.id' || $user->hasRole('superadmin')) {
            $superCount = User::role('superadmin')->count();
            if ($superCount <= 1) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Tidak dapat menghapus superadmin terakhir di sistem.',
                ], 403);
            }
        }

        $user->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'User berhasil dihapus.',
        ]);
    }

    /**
     * Reset password user oleh administrator.
     */
    public function resetPassword(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'password' => 'required|string|min:6',
        ]);

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'status'  => 'success',
            'message' => "Password untuk {$user->name} berhasil di-reset.",
        ]);
    }
}
