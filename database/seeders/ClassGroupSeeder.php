<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClassGroup;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\Classroom;
use App\Models\AcademicYear;
use App\Models\Teacher;

class ClassGroupSeeder extends Seeder
{
    /**
     * Seeder Rombel dengan Hierarki Jenjang & Kelas Khas Pesantren:
     * - Takhossus: TAKHOSSUS 2 A, TAKHOSSUS 2 B, TAKHOSSUS 1 A
     * - MTs: Kelas VII-A, Kelas VII-B, Kelas VIII-A
     * - Tahfidz: Halaqah Abu Bakar Ash-Shiddiq, Halaqah Umar bin Khattab
     */
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();

        $takhossus = EducationalInstitution::where('short_name', 'Takhossus')->first();
        $mts       = EducationalInstitution::where('short_name', 'MTs')->first();
        $tahfidz   = EducationalInstitution::where('short_name', 'Tahfidz')->first();

        $edTk1 = Education::where('name', 'TAKHOSSUS 1')->first();
        $edTk2 = Education::where('name', 'TAKHOSSUS 2')->first();
        $edMts7 = Education::where('name', 'like', '%VII%')->first();
        $edMts8 = Education::where('name', 'like', '%VIII%')->first();
        $edTahfidz1 = Education::where('name', 'like', '%Level 1%')->first();
        $edTahfidz2 = Education::where('name', 'like', '%Level 2%')->first();

        $teachers = Teacher::all();
        $t1 = $teachers[0] ?? null;
        $t2 = $teachers[1] ?? $t1;
        $t3 = $teachers[2] ?? $t1;

        $groups = [
            // ── TAKHOSSUS ──
            [
                'code' => 'TK-2A',
                'name' => 'TAKHOSSUS 2 A',
                'educational_institution_id' => $takhossus?->id,
                'education_id'               => $edTk2?->id,
                'homeroom_teacher_id'        => $t1?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 35,
            ],
            [
                'code' => 'TK-2B',
                'name' => 'TAKHOSSUS 2 B',
                'educational_institution_id' => $takhossus?->id,
                'education_id'               => $edTk2?->id,
                'homeroom_teacher_id'        => $t2?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 35,
            ],
            [
                'code' => 'TK-1A',
                'name' => 'TAKHOSSUS 1 A',
                'educational_institution_id' => $takhossus?->id,
                'education_id'               => $edTk1?->id,
                'homeroom_teacher_id'        => $t3?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 35,
            ],

            // ── MTs (FORMAL) ──
            [
                'code' => 'VII-A',
                'name' => 'Kelas VII-A',
                'educational_institution_id' => $mts?->id,
                'education_id'               => $edMts7?->id,
                'homeroom_teacher_id'        => $t1?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 32,
            ],
            [
                'code' => 'VII-B',
                'name' => 'Kelas VII-B',
                'educational_institution_id' => $mts?->id,
                'education_id'               => $edMts7?->id,
                'homeroom_teacher_id'        => $t2?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 32,
            ],
            [
                'code' => 'VIII-A',
                'name' => 'Kelas VIII-A',
                'educational_institution_id' => $mts?->id,
                'education_id'               => $edMts8?->id,
                'homeroom_teacher_id'        => $t3?->id,
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 30,
            ],

            // ── TAHFIDZ ──
            [
                'code' => 'HLQ-ABUBAKAR',
                'name' => 'Halaqah Abu Bakar Ash-Shiddiq',
                'educational_institution_id' => $tahfidz?->id,
                'education_id'               => $edTahfidz1?->id,
                'homeroom_teacher_id'        => $t3?->id,
                'gender'                     => 'L',
                'progression_type'           => 'leveling',
                'target_level'               => 'Juz 30 (An-Nas s.d An-Naba)',
                'capacity'                   => 15,
            ],
            [
                'code' => 'HLQ-UMAR',
                'name' => 'Halaqah Umar bin Khattab',
                'educational_institution_id' => $tahfidz?->id,
                'education_id'               => $edTahfidz2?->id,
                'homeroom_teacher_id'        => $t1?->id,
                'gender'                     => 'L',
                'progression_type'           => 'leveling',
                'target_level'               => 'Juz 29 (Al-Mulk s.d Al-Mursalat)',
                'capacity'                   => 15,
            ],
        ];

        foreach ($groups as $g) {
            ClassGroup::updateOrCreate(
                ['code' => $g['code'], 'academic_year_id' => $tahun->id],
                array_merge($g, ['is_active' => true])
            );
        }
    }
}
