<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

/**
 * Seeder matriks permission & pengaitan menu ke role.
 * Pola: {permission_slug}.{action} untuk action = view/create/update/delete/print/approve.
 * Idempotent: pertama pastikan permission ada, lalu sync ke role.
 */
class RolePermissionSeeder extends Seeder
{
    private const ACTIONS = ['view', 'create', 'update', 'delete', 'print', 'approve'];

    /**
     * Definisi permission per role berbasis slug menu.
     * superadmin dapat semua (otomatis).
     *
     * @return array<string, array<string, array<string>>>
     *           role => menuSlug => [actions]
     */
    private function assignmentMatrix(): array
    {
        $stafMatrix = [
            'dashboard'       => ['view'],
            'jenjang'         => ['view'],
            'tahun-akademik'  => ['view'],
            'mapel'           => ['view'],
            'jam-pelajaran'   => ['view'],
            'guru'            => ['view'],
            'kelas'           => ['view'],
            'ruang-kelas'     => ['view'],
            'rombel'          => ['view'],
            'siswa'           => ['view', 'create', 'update', 'print'],
            'kenaikan-kelas'  => ['view'],
            'kbm'             => ['view', 'print'],
            'presensi'        => ['view', 'create'],
            'rapor'           => ['view'],
        ];

        $asatidzMatrix = [
            'dashboard'       => ['view'],
            'jenjang'         => ['view'],
            'tahun-akademik'  => ['view'],
            'mapel'           => ['view'],
            'jam-pelajaran'   => ['view'],
            'guru'            => ['view'],
            'kelas'           => ['view'],
            'ruang-kelas'     => ['view'],
            'rombel'          => ['view'],
            'siswa'           => ['view'],
            'kbm'             => ['view', 'create', 'update'],
            'presensi'        => ['view', 'create'],
            'rapor'           => ['view', 'create', 'update', 'approve'],
        ];

        $walikelasMatrix = [
            'dashboard'       => ['view'],
            'jenjang'         => ['view'],
            'tahun-akademik'  => ['view'],
            'mapel'           => ['view'],
            'jam-pelajaran'   => ['view'],
            'guru'            => ['view'],
            'kelas'           => ['view'],
            'ruang-kelas'     => ['view'],
            'rombel'          => ['view'],
            'siswa'           => ['view', 'update', 'print'],
            'kenaikan-kelas'  => ['view', 'update'],
            'kbm'             => ['view'],
            'presensi'        => ['view', 'create'],
            'rapor'           => ['view', 'print'],
        ];

        return [
            'admin' => [
                'dashboard'       => ['view'],
                'jenjang'         => ['view', 'create', 'update', 'delete'],
                'tahun-akademik'  => ['view', 'create', 'update', 'delete'],
                'mapel'           => ['view', 'create', 'update', 'delete', 'print'],
                'jam-pelajaran'   => ['view', 'create', 'update', 'delete'],
                'guru'            => ['view', 'create', 'update', 'delete'],
                'kelas'           => ['view', 'create', 'update', 'delete'],
                'ruang-kelas'     => ['view', 'create', 'update', 'delete'],
                'rombel'          => ['view', 'create', 'update', 'delete'],
                'siswa'           => ['view', 'create', 'update', 'delete', 'print'],
                'kenaikan-kelas'  => ['view', 'update', 'approve'],
                'kbm'             => ['view', 'create', 'update', 'delete', 'print'],
                'presensi'        => ['view', 'create', 'update', 'print'],
                'rapor'           => ['view', 'create', 'update', 'print', 'approve'],
                'masa-nilai'      => ['view', 'create', 'update', 'delete'],
                'user'            => ['view', 'create', 'update', 'delete'],
                'menu'            => ['view', 'create', 'update', 'delete'],
                'role'            => ['view', 'create', 'update', 'delete'],
            ],
            'staf'             => $stafMatrix,
            'staf-kubar'       => $stafMatrix,
            'staf-tibyan'      => $stafMatrix,
            'asatidz'          => $asatidzMatrix,
            'asatidz-kubar'    => $asatidzMatrix,
            'asatidz-tibyan'   => $asatidzMatrix,
            'walikelas'        => $walikelasMatrix,
            'walikelas-kubar'  => $walikelasMatrix,
            'walikelas-tibyan' => $walikelasMatrix,
        ];
    }

    public function run(): void
    {
        $this->cleanupLegacyUnderscorePermissions();
        $this->ensurePermissionsExist();
        $matrix = $this->assignmentMatrix();

        // superadmin: semua permission & semua menu
        $super = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        if ($super) {
            $super->syncPermissions(Permission::where('guard_name', 'api')->pluck('name'));
            $super->menus()->sync(Menu::pluck('id'));
        }

        // role lain (termasuk admin dan role spesifik program): sync permission & menu berdasarkan matriks
        foreach ($matrix as $roleName => $menuMap) {
            $role = Role::where('name', $roleName)->where('guard_name', 'api')->first();
            if (!$role) continue;

            $permNames = [];
            $menuIds = [];
            foreach ($menuMap as $menuSlug => $actions) {
                $menu = Menu::where('slug', $menuSlug)->first();
                if ($menu) {
                    $menuIds[] = $menu->id;
                    if ($menu->parent_id && !in_array($menu->parent_id, $menuIds)) {
                        $menuIds[] = $menu->parent_id;
                    }

                    $permKey = $menu->getPermissionKey();
                    foreach ($actions as $action) {
                        $permNames[] = "{$permKey}.{$action}";
                    }
                }
            }

            $role->syncPermissions(array_values(array_unique($permNames)));
            $role->menus()->sync(array_values(array_unique($menuIds)));
        }

        // Cache spatie
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function cleanupLegacyUnderscorePermissions(): void
    {
        $legacyPrefixes = ['tahun_akademik.', 'jam_pelajaran.', 'kenaikan_kelas.'];
        foreach ($legacyPrefixes as $prefix) {
            Permission::where('guard_name', 'api')
                ->where('name', 'like', $prefix . '%')
                ->delete();
        }
    }

    /**
     * Pastikan permission {permission_slug}.{action} ada di tabel permissions.
     */
    private function ensurePermissionsExist(): void
    {
        foreach (Menu::whereNotNull('permission_slug')->get() as $menu) {
            $key = $menu->getPermissionKey();
            foreach (self::ACTIONS as $action) {
                Permission::firstOrCreate(
                    ['name' => "{$key}.{$action}", 'guard_name' => 'api'],
                    ['name' => "{$key}.{$action}", 'guard_name' => 'api']
                );
            }
        }
    }
}
