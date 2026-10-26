<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeder akun superadmin default.
 * Idempotent: updateOrCreate, assign role superadmin.
 */
class SuperAdminSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('name', 'superadmin')->where('guard_name', 'api')->first();

        $user = User::updateOrCreate(
            ['email' => 'superadmin@tarbiyah.id'],
            [
                'name'     => 'Super Administrator',
                'password' => Hash::make('superadmin123'),
                'role'     => 'superadmin',
            ]
        );

        if ($role) {
            $user->syncRoles([$role]);
        }
    }
}
