<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Role;

class UserSeeder extends Seeder
{
    /**
     * Seeder akun pengguna (admin, guru tetap, guru luar, musyrif).
     * Dipisah agar mudah di-maintain & re-run tanpa menyentuh data lain.
     */
    public function run(): void
    {
        $mudir = User::updateOrCreate(
            ['email' => 'mudir@tarbiyah.id'],
            [
                'name'     => 'KH. Abdullah Syukri, M.Pd.',
                'password' => Hash::make('password'),
                'role'     => 'superadmin',
            ]
        );
        $roleSuper = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();
        if ($roleSuper) {
            $mudir->syncRoles([$roleSuper]);
        }

        $admin = User::updateOrCreate(
            ['email' => 'admin@tarbiyah.id'],
            [
                'name'     => 'Administrator Tarbiyah',
                'password' => Hash::make('admin12345'),
                'role'     => 'admin',
            ]
        );
        $roleAdmin = Role::where('name', 'admin')->where('guard_name', 'api')->first();
        if ($roleAdmin) {
            $admin->syncRoles([$roleAdmin]);
        }

        $guruRole = Role::where('name', 'asatidz')->where('guard_name', 'api')->first();

        $zaki = User::updateOrCreate(
            ['email' => 'ahmad.zaki@tarbiyah.id'],
            [
                'name'     => 'Ust. Ahmad Zaki, S.Pd.I',
                'password' => Hash::make('guru12345'),
                'role'     => 'asatidz',
            ]
        );
        if ($guruRole) {
            $zaki->syncRoles([$guruRole]);
        }

        $rahma = User::updateOrCreate(
            ['email' => 'siti.rahma@tarbiyah.id'],
            [
                'name'     => 'Ibu Siti Rahmah, M.Pd (Guru Luar)',
                'password' => Hash::make('guru12345'),
                'role'     => 'asatidz',
            ]
        );
        if ($guruRole) {
            $rahma->syncRoles([$guruRole]);
        }

        $hannan = User::updateOrCreate(
            ['email' => 'hannan.attaki@tarbiyah.id'],
            [
                'name'     => 'Ust. Hannan, Al-Hafizh',
                'password' => Hash::make('guru12345'),
                'role'     => 'asatidz',
            ]
        );
        if ($guruRole) {
            $hannan->syncRoles([$guruRole]);
        }
    }
}
