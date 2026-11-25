<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder role familiar untuk Tarbiyah.
 * Istilah mengikuti ekosistem (smpt): superadmin, admin, staf, asatidz, walikelas
 * beserta varian spesifik program (staf-kubar, staf-tibyan, asatidz-kubar, asatidz-tibyan, dll).
 * Idempotent: updateOrCreate berbasis nama.
 */
class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $now = now();
        DB::table('programs')->insertOrIgnore([
            [
                'id'          => 1,
                'name'        => 'Tibyan',
                'code'        => 'TBY',
                'description' => 'Program Dirasah Takhossus Pendalaman Kitab Kuning',
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
            [
                'id'          => 2,
                'name'        => 'Kubar',
                'code'        => 'KBR',
                'description' => "Program Kuliyyah Tarbiyah Mu'allimin Pesantren",
                'created_at'  => $now,
                'updated_at'  => $now,
            ],
        ]);

        $roles = [
            'superadmin'       => null,
            'admin'            => null,
            'staf'             => null,
            'asatidz'          => null,
            'walikelas'        => null,
            'staf-tibyan'      => 1,
            'staf-kubar'       => 2,
            'asatidz-tibyan'   => 1,
            'asatidz-kubar'    => 2,
            'walikelas-tibyan' => 1,
            'walikelas-kubar'  => 2,
        ];

        foreach ($roles as $roleName => $programId) {
            Role::updateOrCreate(
                ['name' => $roleName, 'guard_name' => 'api'],
                ['name' => $roleName, 'guard_name' => 'api', 'program_id' => $programId]
            );
        }
    }
}
