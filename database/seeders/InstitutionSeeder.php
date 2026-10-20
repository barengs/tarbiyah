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
     * Seeder lembaga pendidikan, jenjang, dan ruang kelas.
     * Mendukung dua model kenaikan kelas:
     *  - progression_type 'semester' : madrasah formal (SMP/SMA/MTs/MA)
     *  - progression_type 'leveling' : halaqah tahfidz (kenaikan berbasis milestone mingguan)
     */
    public function run(): void
    {
        // ── Tipe Pendidikan ──
        $tipeFormal  = EducationType::firstOrCreate(['name' => 'Formal Madrasah']);
        $tipeTahfidz = EducationType::firstOrCreate(['name' => "Tahfidz Al-Qur'an"]);

        // ── Lembaga 1: MTs (Semesteran) ──
        $mts = EducationalInstitution::updateOrCreate(
            ['short_name' => 'MTs'],
            [
                'education_type_id'   => $tipeFormal->id,
                'registration_number' => 'NPSN-20261001',
                'name'                => 'Madrasah Tsanawiyah (MTs) Tarbiyah',
                'progression_type'    => 'semester',
                'address'             => 'Jl. Pesantren No. 1, Komplek Pendidikan Putra',
                'phone'               => '021-88997766',
                'email'               => 'mts@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'Ust. Dr. Muhammad Ridwan, M.A.',
            ]
        );

        // ── Lembaga 2: Markaz Tahfidz (Leveling Mingguan) ──
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

        // ── Jenjang Formal ──
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas VII (Tujuh)'],
            ['level' => 1]
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas VIII (Delapan)'],
            ['level' => 2]
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Kelas IX (Sembilan)'],
            ['level' => 3]
        );

        // ── Jenjang Tahfidz (Leveling) ──
        Education::firstOrCreate(
            ['educational_institution_id' => $tahfidz->id, 'name' => 'Level 1 - Juz 30 (An-Nas s.d An-Naba)'],
            ['level' => 1]
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $tahfidz->id, 'name' => 'Level 2 - Juz 29 (Al-Mulk s.d Al-Mursalat)'],
            ['level' => 2]
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $tahfidz->id, 'name' => 'Level 3 - Juz 1 s.d 5 (Al-Baqarah)'],
            ['level' => 3]
        );

        // ── Ruang Kelas Fisik ──
        Classroom::firstOrCreate(
            ['educational_institution_id' => $mts->id, 'name' => 'Ruang Kelas 7-A'],
            ['code' => 'R-7A', 'capacity' => 32]
        );
    }
}
