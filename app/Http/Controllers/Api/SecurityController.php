<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;

class SecurityController extends Controller
{
    /**
     * Menu sidebar dinamis untuk user yang sedang login.
     * Mengembalikan daftar menu sesuai role aktif.
     */
    public function sidebar(Request $request)
    {
        $user = auth('api')->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'Unauthenticated', 'data' => []], 401);
        }

        // Superadmin melihat semua menu aktif
        if ($user->hasRole('superadmin')) {
            $menus = Menu::whereNull('parent_id')
                ->where('is_active', true)
                ->with(['children' => function ($q) {
                    $q->where('is_active', true)->orderBy('sort_order');
                }])
                ->orderBy('sort_order')
                ->get();

            return response()->json([
                'status' => 'success',
                'data'   => $menus,
            ]);
        }

        $roleIds = $user->roles->pluck('id')->toArray();

        // Menu top level yang berelasi dengan role user ATAU memiliki child yang berelasi
        $menus = Menu::whereNull('parent_id')
            ->where('is_active', true)
            ->where(function ($query) use ($roleIds) {
                $query->whereHas('roles', function ($q) use ($roleIds) {
                    $q->whereIn('roles.id', $roleIds);
                })->orWhereHas('children', function ($q) use ($roleIds) {
                    $q->where('is_active', true)->whereHas('roles', function ($sq) use ($roleIds) {
                        $sq->whereIn('roles.id', $roleIds);
                    });
                });
            })
            ->with(['children' => function ($q) use ($roleIds) {
                $q->where('is_active', true)
                    ->whereHas('roles', function ($sq) use ($roleIds) {
                        $sq->whereIn('roles.id', $roleIds);
                    })
                    ->orderBy('sort_order');
            }])
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $menus,
        ]);
    }

    /**
     * Mengambil seluruh data menu (struktur tree) untuk manajemen admin.
     */
    public function getMenus()
    {
        $menus = Menu::with(['children' => function ($q) {
            $q->orderBy('sort_order');
        }])
        ->whereNull('parent_id')
        ->orderBy('sort_order')
        ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $menus,
        ]);
    }

    /**
     * Tambah menu baru.
     */
    public function storeMenu(Request $request)
    {
        $validated = $request->validate([
            'parent_id'       => 'nullable|exists:menus,id',
            'name'            => 'required|string|max:100',
            'slug'            => 'required|string|max:100|unique:menus,slug',
            'icon'            => 'nullable|string|max:50',
            'path'            => 'nullable|string|max:255',
            'permission_slug' => 'nullable|string|max:100',
            'sort_order'      => 'nullable|integer',
            'is_active'       => 'nullable|boolean',
        ]);

        $validated['sort_order'] = $validated['sort_order'] ?? (Menu::where('parent_id', $validated['parent_id'] ?? null)->max('sort_order') + 1);
        $validated['is_active']  = $validated['is_active'] ?? true;

        $menu = Menu::create($validated);

        // Jika memiliki permission_slug, otomatis buat permission crud standar jika belum ada
        if ($menu->permission_slug) {
            $actions = ['view', 'create', 'update', 'delete', 'print', 'approve'];
            foreach ($actions as $action) {
                Permission::firstOrCreate(
                    ['name' => "{$menu->permission_slug}.{$action}", 'guard_name' => 'api'],
                    ['name' => "{$menu->permission_slug}.{$action}", 'guard_name' => 'api']
                );
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Menu berhasil ditambahkan.',
            'data'    => $menu->load('children'),
        ], 201);
    }

    /**
     * Update menu.
     */
    public function updateMenu(Request $request, $id)
    {
        $menu = Menu::findOrFail($id);

        $validated = $request->validate([
            'parent_id'       => 'nullable|exists:menus,id|not_in:' . $id,
            'name'            => 'required|string|max:100',
            'slug'            => 'required|string|max:100|unique:menus,slug,' . $id,
            'icon'            => 'nullable|string|max:50',
            'path'            => 'nullable|string|max:255',
            'permission_slug' => 'nullable|string|max:100',
            'sort_order'      => 'nullable|integer',
            'is_active'       => 'nullable|boolean',
        ]);

        $menu->update($validated);

        // Pastikan permissions ter-generate jika permission_slug ada
        if ($menu->permission_slug) {
            $actions = ['view', 'create', 'update', 'delete', 'print', 'approve'];
            foreach ($actions as $action) {
                Permission::firstOrCreate(
                    ['name' => "{$menu->permission_slug}.{$action}", 'guard_name' => 'api'],
                    ['name' => "{$menu->permission_slug}.{$action}", 'guard_name' => 'api']
                );
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Menu berhasil diperbarui.',
            'data'    => $menu->load('children'),
        ]);
    }

    /**
     * Hapus menu.
     */
    public function destroyMenu($id)
    {
        $menu = Menu::findOrFail($id);

        // Jangan hapus menu inti sistem
        if (in_array($menu->slug, ['dashboard', 'pengaturan', 'menu', 'role', 'user'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Menu sistem ini tidak dapat dihapus.',
            ], 403);
        }

        // Hapus child menus jika ada
        $menu->children()->delete();
        $menu->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Menu berhasil dihapus.',
        ]);
    }

    /**
     * Daftar seluruh role beserta relasi menu & permissions.
     */
    public function getRoles()
    {
        $roles = Role::where('guard_name', 'api')
            ->with(['menus', 'permissions'])
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $roles,
        ]);
    }

    /**
     * Tambah role baru.
     */
    public function storeRole(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
        ]);

        $role = Role::create([
            'name'       => Str::slug($validated['name']),
            'guard_name' => 'api',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Role berhasil ditambahkan.',
            'data'    => $role->load(['menus', 'permissions']),
        ], 201);
    }

    /**
     * Update role.
     */
    public function updateRole(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, ['superadmin', 'admin'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Nama role sistem utama tidak dapat diubah.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name,' . $id,
        ]);

        $role->update([
            'name' => Str::slug($validated['name']),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Role berhasil diperbarui.',
            'data'    => $role->load(['menus', 'permissions']),
        ]);
    }

    /**
     * Hapus role.
     */
    public function destroyRole($id)
    {
        $role = Role::findOrFail($id);

        if (in_array($role->name, ['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Role bawaan sistem tidak dapat dihapus.',
            ], 403);
        }

        $role->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Role berhasil dihapus.',
        ]);
    }

    /**
     * Sinkronisasi hak akses menu untuk suatu role.
     */
    public function syncRoleMenus(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'menu_ids'   => 'present|array',
            'menu_ids.*' => 'exists:menus,id',
        ]);

        // Pastikan parent menu ikut tersinkron jika child dipilih
        $menuIds = $validated['menu_ids'];
        $parentIds = Menu::whereIn('id', $menuIds)
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique()
            ->toArray();

        $allMenuIds = array_values(array_unique(array_merge($menuIds, $parentIds)));
        $role->menus()->sync($allMenuIds);

        return response()->json([
            'status'  => 'success',
            'message' => 'Hak akses menu role berhasil diperbarui.',
            'data'    => $role->fresh()->load('menus'),
        ]);
    }

    /**
     * Sinkronisasi permissions untuk suatu role.
     */
    public function syncRolePermissions(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permissions'   => 'present|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $role->syncPermissions($validated['permissions']);
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'status'  => 'success',
            'message' => 'Permission matrix role berhasil diperbarui.',
            'data'    => $role->fresh()->load('permissions'),
        ]);
    }

    /**
     * Mengambil seluruh daftar permission yang tersedia dikelompokkan berdasarkan modul.
     */
    public function getPermissions()
    {
        $permissions = Permission::where('guard_name', 'api')
            ->orderBy('name')
            ->get();

        // Kelompokkan berdasarkan modul (sebelum titik)
        $grouped = [];
        foreach ($permissions as $perm) {
            $parts = explode('.', $perm->name, 2);
            $module = $parts[0] ?? 'general';
            $action = $parts[1] ?? 'general';

            if (!isset($grouped[$module])) {
                $grouped[$module] = [
                    'module'      => $module,
                    'permissions' => [],
                ];
            }
            $grouped[$module]['permissions'][] = [
                'id'     => $perm->id,
                'name'   => $perm->name,
                'action' => $action,
            ];
        }

        return response()->json([
            'status' => 'success',
            'data'   => array_values($grouped),
            'raw'    => $permissions,
        ]);
    }
}
