<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClassGroup;
use App\Models\ClassGroupSubject;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\Classroom;
use App\Models\AcademicYear;
use App\Models\Teacher;
use App\Models\Study;

class ClassGroupSeeder extends Seeder
{
    /**
     * Seeder Rombongan Belajar (Rombel) Formal Semesteran & Halaqah Tahfidz Leveling Mingguan.
     */
    public function run(): void
    {
        $mts     = EducationalInstitution::where('short_name', 'MTs')->first();
        $tahfidz = EducationalInstitution::where('short_name', 'Tahfidz')->first();

        $level7     = Education::where('name', 'Kelas VII (Tujuh)')->first();
        $levelJuz30 = Education::where('name', 'like', '%Juz 30%')->first();

        $roomA = Classroom::where('code', 'R-7A')->first();
        $tahun = AcademicYear::where('active', true)->first();

        $guruFiqih = Teacher::where('nip', '198501012010011001')->first();
        $guruMath  = Teacher::where('nip', '199203152018022002')->first();
        $musyrif   = Teacher::where('nip', '199008202015031003')->first();

        $studyFiqih = Study::where('code', 'FQH-07')->first();
        $studyMath  = Study::where('code', 'MTK-07')->first();

        // ── 1. Rombel Formal Semesteran (Kelas VII-A) ──
        $rombel7A = ClassGroup::firstOrCreate(
            ['code' => 'VII-A', 'academic_year_id' => $tahun->id],
            [
                'educational_institution_id' => $mts->id,
                'education_id'               => $level7?->id,
                'classroom_id'               => $roomA?->id,
                'homeroom_teacher_id'        => $guruFiqih?->id,
                'name'                       => 'Kelas VII-A',
                'gender'                     => 'L',
                'progression_type'           => 'semester',
                'capacity'                   => 30,
                'is_active'                  => true,
            ]
        );

        // ── 2. Rombel Halaqah Tahfidz Leveling Mingguan ──
        ClassGroup::firstOrCreate(
            ['code' => 'HLQ-ABUBAKAR', 'academic_year_id' => $tahun->id],
            [
                'educational_institution_id' => $tahfidz->id,
                'education_id'               => $levelJuz30?->id,
                'homeroom_teacher_id'        => $musyrif?->id,
                'name'                       => 'Halaqah Abu Bakar Ash-Shiddiq',
                'gender'                     => 'L',
                'progression_type'           => 'leveling',
                'target_level'               => 'Juz 30 (An-Nas s.d An-Naba)',
                'capacity'                   => 15,
                'is_active'                  => true,
            ]
        );

        // ── 3. Penugasan Guru ke Rombel ──
        if ($studyFiqih && $guruFiqih) {
            ClassGroupSubject::firstOrCreate([
                'class_group_id' => $rombel7A->id,
                'study_id'       => $studyFiqih->id,
            ], ['teacher_id' => $guruFiqih->id]);
        }

        if ($studyMath && $guruMath) {
            ClassGroupSubject::firstOrCreate([
                'class_group_id' => $rombel7A->id,
                'study_id'       => $studyMath->id,
            ], ['teacher_id' => $guruMath->id]); // Guru Luar mengajar di VII-A
        }
    }
}
