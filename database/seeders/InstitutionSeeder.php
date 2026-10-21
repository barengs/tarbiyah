<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\EducationType;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\Classroom;

class InstitutionSeeder extends Seeder
{
    /**
     * Seeder Jenjang & Lembaga Pendidikan Pesantren Lengkap:
     * 1. Takhossus / Diniyah Pesantren
     * 2. Madrasah Tsanawiyah (MTs) Formal Kemenag
     * 3. Markaz Tahfidz Al-Qur'an Terpadu
     */
    public function run(): void
    {
        // ── Tipe Pendidikan ──
        $tipePesantren = EducationType::firstOrCreate(['name' => 'Pesantren & Diniyah Salaf']);
        $tipeFormal    = EducationType::firstOrCreate(['name' => 'Formal Madrasah (Kemenag)']);
        $tipeTahfidz   = EducationType::firstOrCreate(['name' => "Tahfidz Al-Qur'an"]);

        // ── 1. Lembaga Takhossus ──
        $takhossus = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Takhossus'],
            [
                'education_type_id'   => $tipePesantren->id,
                'registration_number' => 'NSPP-51003528',
                'name'                => 'Takhossus Pendalaman Kitab Kuning',
                'progression_type'    => 'semester',
                'address'             => 'Komplek Pondok Pesantren Panyeppen Lt. 1',
                'phone'               => '081234567890',
                'email'               => 'takhossus@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'K.H. Mudatsir Badruddin',
            ]
        );

        // ── 2. Lembaga MTs ──
        $mts = EducationalInstitution::updateOrCreate(
            ['short_name' => 'MTs'],
            [
                'education_type_id'   => $tipeFormal->id,
                'registration_number' => 'NPSN-20261001',
                'name'                => 'Madrasah Tsanawiyah (MTs) Panyeppen',
                'progression_type'    => 'semester',
                'address'             => 'Komplek Gedung Pendidikan Barat',
                'phone'               => '021-88997766',
                'email'               => 'mts@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'Ust. Dr. Muhammad Ridwan, M.A.',
            ]
        );

        // ── 3. Lembaga Tahfidz ──
        $tahfidz = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Tahfidz'],
            [
                'education_type_id'   => $tipeTahfidz->id,
                'registration_number' => 'NSP-99887711',
                'name'                => "Markaz Tahfidz Al-Qur'an Terpadu",
                'progression_type'    => 'leveling',
                'address'             => 'Gedung Halaqah Tahfidz Lt. 2',
                'phone'               => '021-88997788',
                'email'               => 'tahfidz@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'K.H. Syamsuddin, Lc., Al-Hafizh',
            ]
        );

        // ── Kelas di Takhossus ──
        Education::firstOrCreate(
            ['educational_institution_id' => $takhossus->id, 'name' => 'TAKHOSSUS 1'],
            ['level' => 1, 'description' => 'Tingkat Persiapan Nahwu & Shorof']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $takhossus->id, 'name' => 'TAKHOSSUS 2'],
            ['level' => 2, 'description' => 'Tingkat Lanjutan Pendalaman Kitab']
        );

        // ── Kelas di MTs ──
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas VII (Tujuh)'],
            ['level' => 1, 'description' => 'Kelas VII MTs']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas VIII (Delapan)'],
            ['level' => 2, 'description' => 'Kelas VIII MTs']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas IX (Sembilan)'],
            ['level' => 3, 'description' => 'Kelas IX MTs']
        );

        // ── Tingkat di Tahfidz ──
        Education::firstOrCreate(
            ['educational_institution_id' => $tahfidz->id, 'name' => 'Level 1 (Juz 30)'],
            ['level' => 1, 'description' => 'Juz 30 An-Nas s.d An-Naba']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $tahfidz->id, 'name' => 'Level 2 (Juz 29)'],
            ['level' => 2, 'description' => 'Juz 29 Al-Mulk s.d Al-Mursalat']
        );

        // ── Ruang Kelas Fisik ──
        Classroom::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Ruang 7-A'],
            ['code' => 'R-7A', 'capacity' => 32]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $takhossus->id, 'name' => 'Ruang Takhossus 2-A'],
            ['code' => 'R-TK2A', 'capacity' => 35]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $takhossus->id, 'name' => 'Ruang Takhossus 2-B'],
            ['code' => 'R-TK2B', 'capacity' => 35]
        );
    }
}
