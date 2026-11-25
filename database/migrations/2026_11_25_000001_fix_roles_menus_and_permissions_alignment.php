<?php

use Database\Seeders\MenuSeeder;
use Database\Seeders\RolePermissionSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Selaraskan permission_slug menu, matriks role-menu & role-permission
     * (termasuk role berbasis program: staf-kubar, staf-tibyan, asatidz-kubar, dll),
     * serta bersihkan akun dummy seeder jika tidak digunakan.
     */
    public function up(): void
    {
        // 1. Selaraskan permission_slug yang sebelumnya memakai underscore menjadi hyphen
        DB::table('menus')->where('slug', 'tahun-akademik')->update(['permission_slug' => 'tahun-akademik']);
        DB::table('menus')->where('slug', 'jam-pelajaran')->update(['permission_slug' => 'jam-pelajaran']);
        DB::table('menus')->where('slug', 'kenaikan-kelas')->update(['permission_slug' => 'kenaikan-kelas']);

        // 2. Jalankan RoleSeeder, MenuSeeder, dan RolePermissionSeeder yang sudah diperbaiki
        app(RoleSeeder::class)->run();
        app(MenuSeeder::class)->run();
        app(RolePermissionSeeder::class)->run();

        // 3. Hapus akun dummy dari UserSeeder yang berpotensi menyebabkan kebocoran/tabrakan ID
        $dummyEmails = [
            'mudir@tarbiyah.id',
            'ahmad.zaki@tarbiyah.id',
            'siti.rahma@tarbiyah.id',
            'hannan.attaki@tarbiyah.id',
        ];

        $dummyUserIds = DB::table('users')
            ->whereIn('email', $dummyEmails)
            ->pluck('id')
            ->all();

        if (!empty($dummyUserIds)) {
            DB::table('model_has_roles')
                ->where('model_type', 'App\\Models\\User')
                ->whereIn('model_id', $dummyUserIds)
                ->delete();

            DB::table('model_has_permissions')
                ->where('model_type', 'App\\Models\\User')
                ->whereIn('model_id', $dummyUserIds)
                ->delete();

            DB::table('users')
                ->whereIn('id', $dummyUserIds)
                ->delete();
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    public function down(): void
    {
        // Tidak ada rollback destruktif untuk penyelarasan hak akses
    }
};
