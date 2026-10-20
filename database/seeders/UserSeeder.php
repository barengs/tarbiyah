<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class UserSeeder extends Seeder
{
    /**
     * Seeder akun pengguna (admin, guru tetap, guru luar, musyrif).
     * Dipisah agar mudah di-maintain & re-run tanpa menyentuh data lain.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@tarbiyah.id'],
            [
                'name'     => 'Administrator Tarbiyah',
                'password' => Hash::make('admin12345'),
                'role'     => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'ahmad.zaki@tarbiyah.id'],
            [
                'name'     => 'Ust. Ahmad Zaki, S.Pd.I',
                'password' => Hash::make('guru12345'),
                'role'     => 'guru',
            ]
        );

        User::updateOrCreate(
            ['email' => 'siti.rahma@tarbiyah.id'],
            [
                'name'     => 'Ibu Siti Rahmah, M.Pd (Guru Luar)',
                'password' => Hash::make('guru12345'),
                'role'     => 'guru',
            ]
        );

        User::updateOrCreate(
            ['email' => 'hannan.attaki@tarbiyah.id'],
            [
                'name'     => 'Ust. Hannan, Al-Hafizh',
                'password' => Hash::make('guru12345'),
                'role'     => 'guru',
            ]
        );
    }
}
