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
     * Seeder 2 Program Utama Pesantren:
     * 1. KUBAR  -> Jenjang: Ula, Wustha, Ulya
     * 2. TIBYAN -> Jenjang: Takhossus
     */
    public function run(): void
    {
        // ── Tipe Pendidikan ──
        $tipeKubar  = EducationType::firstOrCreate(['name' => 'Program Kubar (Mu\'allimin)']);
        $tipeTibyan = EducationType::firstOrCreate(['name' => 'Program Tibyan (Takhossus)']);

        // ── 1. Program KUBAR ──
        $kubar = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Kubar'],
            [
                'education_type_id'   => $tipeKubar->id,
                'registration_number' => 'KBR-PANYEPPEN-01',
                'name'                => 'Kubar (Kuliyyah Tarbiyah Pesantren)',
                'progression_type'    => 'semester',
                'address'             => 'Komplek Pendidikan Utama Pesantren Panyeppen',
                'phone'               => '081234567890',
                'email'               => 'kubar@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'Ust. Dr. Muhammad Ridwan, M.A.',
            ]
        );

        // ── 2. Program TIBYAN ──
        $tibyan = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Tibyan'],
            [
                'education_type_id'   => $tipeTibyan->id,
                'registration_number' => 'TBY-PANYEPPEN-02',
                'name'                => 'Tibyan (Dirasah Takhossus Kitab)',
                'progression_type'    => 'semester',
                'address'             => 'Gedung Markaz Dirasah Tibyan Lt. 2',
                'phone'               => '085712349876',
                'email'               => 'tibyan@tarbiyah.id',
                'status'              => 'active',
                'headmaster_name'     => 'K.H. Mudatsir Badruddin',
            ]
        );

        // ── Jenjang di KUBAR: Ula, Wustha, Ulya ──
        Education::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Ula'],
            ['level' => 1, 'description' => 'Jenjang Dasar (Ibtida\'iyah Salafiyah)']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Wustha'],
            ['level' => 2, 'description' => 'Jenjang Menengah (Tsanawiyah Salafiyah)']
        );
        Education::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Ulya'],
            ['level' => 3, 'description' => 'Jenjang Atas (Aliyah Salafiyah)']
        );

        // ── Jenjang di TIBYAN: Takhossus ──
        Education::firstOrCreate(
            ['educational_institution_id' => $tibyan->id, 'name' => 'Takhossus'],
            ['level' => 1, 'description' => 'Pendalaman Kitab Kuning & Dirasah Salaf']
        );

        // ── Ruang Kelas Fisik ──
        Classroom::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Ruang Ula 1'],
            ['code' => 'R-ULA1', 'capacity' => 35]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Ruang Wustha 1'],
            ['code' => 'R-WST1', 'capacity' => 35]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $kubar->id, 'name' => 'Ruang Ulya 1'],
            ['code' => 'R-ULY1', 'capacity' => 35]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $tibyan->id, 'name' => 'Ruang Takhossus 1'],
            ['code' => 'R-TK1', 'capacity' => 30]
        );
        Classroom::firstOrCreate(
            ['educational_institution_id' => $tibyan->id, 'name' => 'Ruang Takhossus 2'],
            ['code' => 'R-TK2', 'capacity' => 30]
        );
    }
}
