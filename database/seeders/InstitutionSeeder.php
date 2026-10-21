<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Program;
use App\Models\EducationalInstitution;
use App\Models\EducationType;
use App\Models\Education;
use App\Models\EducationClass;
use App\Models\Classroom;

class InstitutionSeeder extends Seeder
{
    /**
     * Seeder Data Master Berelasi:
     * Program -> Jenjang Pendidikan (Education) -> Tingkat/Kelas (EducationClass) -> Ruang
     */
    public function run(): void
    {
        // ── 1. MASTER PROGRAM PESANTREN ──
        $pTibyan = Program::updateOrCreate(
            ['name' => 'Tibyan'],
            ['code' => 'TBY', 'description' => 'Program Dirasah Takhossus Pendalaman Kitab Kuning']
        );

        $pKubar = Program::updateOrCreate(
            ['name' => 'Kubar'],
            ['code' => 'KBR', 'description' => 'Program Kuliyyah Tarbiyah Mu\'allimin Pesantren']
        );

        // ── Lembaga / Instansi Penyelenggara ──
        $tipeKubar  = EducationType::firstOrCreate(['name' => 'Pesantren Mu\'allimin']);
        $tipeTibyan = EducationType::firstOrCreate(['name' => 'Pesantren Takhossus']);

        $instKubar = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Kubar'],
            [
                'education_type_id'   => $tipeKubar->id,
                'registration_number' => 'KBR-PANYEPPEN-01',
                'name'                => 'Kubar (Kuliyyah Tarbiyah Pesantren)',
                'progression_type'    => 'semester',
                'status'              => 'active',
                'headmaster_name'     => 'Ust. Dr. Muhammad Ridwan, M.A.',
            ]
        );

        $instTibyan = EducationalInstitution::updateOrCreate(
            ['short_name' => 'Tibyan'],
            [
                'education_type_id'   => $tipeTibyan->id,
                'registration_number' => 'TBY-PANYEPPEN-02',
                'name'                => 'Tibyan (Dirasah Takhossus Kitab)',
                'progression_type'    => 'semester',
                'status'              => 'active',
                'headmaster_name'     => 'K.H. Mudatsir Badruddin',
            ]
        );

        // ── 2. MASTER JENJANG PENDIDIKAN (BERELASI DENGAN PROGRAM) ──
        // Kubar -> Ula, Wustha, Ulya
        $edUla = Education::updateOrCreate(
            ['name' => 'Ula'],
            [
                'program_id'                 => $pKubar->id,
                'educational_institution_id' => $instKubar->id,
                'level'                      => 1,
                'description'                => 'Jenjang Dasar (Ibtida\'iyah Salafiyah)',
            ]
        );

        $edWustha = Education::updateOrCreate(
            ['name' => 'Wustha'],
            [
                'program_id'                 => $pKubar->id,
                'educational_institution_id' => $instKubar->id,
                'level'                      => 2,
                'description'                => 'Jenjang Menengah (Tsanawiyah Salafiyah)',
            ]
        );

        $edUlya = Education::updateOrCreate(
            ['name' => 'Ulya'],
            [
                'program_id'                 => $pKubar->id,
                'educational_institution_id' => $instKubar->id,
                'level'                      => 3,
                'description'                => 'Jenjang Atas (Aliyah Salafiyah)',
            ]
        );

        // Tibyan -> Takhossus
        $edTakhossus = Education::updateOrCreate(
            ['name' => 'Takhossus'],
            [
                'program_id'                 => $pTibyan->id,
                'educational_institution_id' => $instTibyan->id,
                'level'                      => 1,
                'description'                => 'Pendalaman Kitab Kuning Salafiyah',
            ]
        );

        // ── 3. MASTER KELAS / TINGKAT (BERELASI DENGAN JENJANG) ──
        // Kelas di Jenjang Ula
        $clsUla1 = EducationClass::updateOrCreate(['code' => 'ULA-1'], ['education_id' => $edUla->id, 'name' => 'Ula Kelas 1']);
        $clsUla2 = EducationClass::updateOrCreate(['code' => 'ULA-2'], ['education_id' => $edUla->id, 'name' => 'Ula Kelas 2']);
        $clsUla3 = EducationClass::updateOrCreate(['code' => 'ULA-3'], ['education_id' => $edUla->id, 'name' => 'Ula Kelas 3']);

        // Kelas di Jenjang Wustha
        $clsWst1 = EducationClass::updateOrCreate(['code' => 'WST-1'], ['education_id' => $edWustha->id, 'name' => 'Wustha Kelas 1']);
        $clsWst2 = EducationClass::updateOrCreate(['code' => 'WST-2'], ['education_id' => $edWustha->id, 'name' => 'Wustha Kelas 2']);
        $clsWst3 = EducationClass::updateOrCreate(['code' => 'WST-3'], ['education_id' => $edWustha->id, 'name' => 'Wustha Kelas 3']);

        // Kelas di Jenjang Ulya
        $clsUly1 = EducationClass::updateOrCreate(['code' => 'ULY-1'], ['education_id' => $edUlya->id, 'name' => 'Ulya Kelas 1']);
        $clsUly2 = EducationClass::updateOrCreate(['code' => 'ULY-2'], ['education_id' => $edUlya->id, 'name' => 'Ulya Kelas 2']);

        // Kelas di Jenjang Takhossus
        $clsTk1 = EducationClass::updateOrCreate(['code' => 'TK-1'], ['education_id' => $edTakhossus->id, 'name' => 'Takhossus 1']);
        $clsTk2 = EducationClass::updateOrCreate(['code' => 'TK-2'], ['education_id' => $edTakhossus->id, 'name' => 'Takhossus 2']);

        // ── Ruang Kelas ──
        Classroom::updateOrCreate(['code' => 'R-ULA1'], ['name' => 'Ruang Ula 1', 'educational_institution_id' => $instKubar->id, 'capacity' => 35]);
        Classroom::updateOrCreate(['code' => 'R-WST1'], ['name' => 'Ruang Wustha 1', 'educational_institution_id' => $instKubar->id, 'capacity' => 35]);
        Classroom::updateOrCreate(['code' => 'R-ULY1'], ['name' => 'Ruang Ulya 1', 'educational_institution_id' => $instKubar->id, 'capacity' => 35]);
        Classroom::updateOrCreate(['code' => 'R-TK1'],  ['name' => 'Ruang Takhossus 1', 'educational_institution_id' => $instTibyan->id, 'capacity' => 30]);
        Classroom::updateOrCreate(['code' => 'R-TK2'],  ['name' => 'Ruang Takhossus 2', 'educational_institution_id' => $instTibyan->id, 'capacity' => 30]);
    }
}
