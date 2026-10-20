<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Teacher;
use App\Models\User;

class TeacherSeeder extends Seeder
{
    /**
     * Seeder data dewan guru: guru tetap pesantren, honorer, dan guru luar mandiri.
     * Setiap guru terhubung dengan akun User agar dapat login langsung.
     */
    public function run(): void
    {
        // Guru Tetap 1 — Fiqih & Bahasa Arab
        $u1 = User::where('email', 'ahmad.zaki@tarbiyah.id')->first();
        Teacher::updateOrCreate(
            ['nip' => '198501012010011001'],
            [
                'user_id'        => $u1?->id,
                'name'           => 'Ust. Ahmad Zaki, S.Pd.I',
                'gender'         => 'L',
                'phone'          => '081234567890',
                'email'          => 'ahmad.zaki@tarbiyah.id',
                'specialization' => 'Fiqih & Bahasa Arab',
                'status'         => 'tetap',
                'is_active'      => true,
            ]
        );

        // Guru Luar — Matematika & IPA (tidak terikat asrama/kamtib)
        $u2 = User::where('email', 'siti.rahma@tarbiyah.id')->first();
        Teacher::updateOrCreate(
            ['nip' => '199203152018022002'],
            [
                'user_id'        => $u2?->id,
                'name'           => 'Ibu Siti Rahmah, M.Pd',
                'gender'         => 'P',
                'phone'          => '082198765432',
                'email'          => 'siti.rahma@tarbiyah.id',
                'specialization' => 'Matematika & IPA',
                'status'         => 'luar', // Guru Luar (Mandiri)
                'is_active'      => true,
            ]
        );

        // Musyrif Tahfidz — Hafizh 30 Juz
        $u3 = User::where('email', 'hannan.attaki@tarbiyah.id')->first();
        Teacher::updateOrCreate(
            ['nip' => '199008202015031003'],
            [
                'user_id'        => $u3?->id,
                'name'           => 'Ust. Hannan, Al-Hafizh',
                'gender'         => 'L',
                'phone'          => '085712349876',
                'email'          => 'hannan.attaki@tarbiyah.id',
                'specialization' => "Tahfidz Al-Qur'an 30 Juz",
                'status'         => 'tetap',
                'is_active'      => true,
            ]
        );
    }
}
