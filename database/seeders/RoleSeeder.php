<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

/**
 * Seeder role familiar untuk Tarbiyah.
 * Istilah mengikuti ekosistem (smpt): superadmin, admin, staf, asatidz, walikelas.
 * Idempotent: updateOrCreate berbasis nama.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = ['superadmin', 'admin', 'staf', 'asatidz', 'walikelas'];

        foreach ($roles as $roleName) {
            Role::updateOrCreate(
                ['name' => $roleName, 'guard_name' => 'api'],
                ['name' => $roleName, 'guard_name' => 'api']
            );
        }
    }
}
