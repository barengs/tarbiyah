<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClassGroup;
use App\Models\Program;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\EducationClass;
use App\Models\AcademicYear;
use App\Models\Teacher;
use App\Models\Classroom;

class ClassGroupSeeder extends Seeder
{
    /**
     * Seeder Rombel dengan Relasi Data Master Lengkap:
     * Program -> Jenjang (Education) -> Kelas (EducationClass) -> Rombel (ClassGroup)
     */
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();

        $pKubar  = Program::where('name', 'Kubar')->first();
        $pTibyan = Program::where('name', 'Tibyan')->first();

        $instKubar  = EducationalInstitution::where('short_name', 'Kubar')->first();
        $instTibyan = EducationalInstitution::where('short_name', 'Tibyan')->first();

        $edUla       = Education::where('name', 'Ula')->first();
        $edWustha    = Education::where('name', 'Wustha')->first();
        $edUlya      = Education::where('name', 'Ulya')->first();
        $edTakhossus = Education::where('name', 'Takhossus')->first();

        // Kelas
        $clsUla1 = EducationClass::where('code', 'ULA-1')->first();
        $clsUla2 = EducationClass::where('code', 'ULA-2')->first();
        $clsWst1 = EducationClass::where('code', 'WST-1')->first();
        $clsWst2 = EducationClass::where('code', 'WST-2')->first();
        $clsUly1 = EducationClass::where('code', 'ULY-1')->first();
        $clsTk1  = EducationClass::where('code', 'TK-1')->first();
        $clsTk2  = EducationClass::where('code', 'TK-2')->first();

        $teachers = Teacher::where('is_active', true)->orderBy('id')->get();
        $t1 = $teachers[0] ?? null;
        $t2 = $teachers[1] ?? $t1;
        $t3 = $teachers[2] ?? $t1;
        $t4 = $teachers[count($teachers) - 1];

        $rUla1 = Classroom::where('code', 'R-ULA1')->first();
        $rWst1 = Classroom::where('code', 'R-WST1')->first();
        $rUly1 = Classroom::where('code', 'R-ULY1')->first();
        $rTk1  = Classroom::where('code', 'R-TK1')->first();
        $rTk2  = Classroom::where('code', 'R-TK2')->first();

        $groups = [
            // ── KUBAR: JENJANG ULA ──
            ['code' => 'ULA-1A', 'name' => 'Ula 1 A', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edUla->id, 'education_class_id' => $clsUla1->id, 'homeroom_teacher_id' => $t1?->id, 'capacity' => 35, 'classroom_id' => $rUla1?->id],
            ['code' => 'ULA-1B', 'name' => 'Ula 1 B', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edUla->id, 'education_class_id' => $clsUla1->id, 'homeroom_teacher_id' => $t2?->id, 'capacity' => 35, 'classroom_id' => $rUla1?->id],
            ['code' => 'ULA-2A', 'name' => 'Ula 2 A', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edUla->id, 'education_class_id' => $clsUla2->id, 'homeroom_teacher_id' => $t3?->id, 'capacity' => 35, 'classroom_id' => $rUla1?->id],

            // ── KUBAR: JENJANG WUSTHA ──
            ['code' => 'WST-1A', 'name' => 'Wustha 1 A', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edWustha->id, 'education_class_id' => $clsWst1->id, 'homeroom_teacher_id' => $t1?->id, 'capacity' => 35, 'classroom_id' => $rWst1?->id],
            ['code' => 'WST-1B', 'name' => 'Wustha 1 B', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edWustha->id, 'education_class_id' => $clsWst1->id, 'homeroom_teacher_id' => $t2?->id, 'capacity' => 35, 'classroom_id' => $rWst1?->id],
            ['code' => 'WST-2A', 'name' => 'Wustha 2 A', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edWustha->id, 'education_class_id' => $clsWst2->id, 'homeroom_teacher_id' => $t3?->id, 'capacity' => 35, 'classroom_id' => $rWst1?->id],

            // ── KUBAR: JENJANG ULYA ──
            ['code' => 'ULY-1A', 'name' => 'Ulya 1 A', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edUlya->id, 'education_class_id' => $clsUly1->id, 'homeroom_teacher_id' => $t1?->id, 'capacity' => 35, 'classroom_id' => $rUly1?->id],
            ['code' => 'ULY-1B', 'name' => 'Ulya 1 B', 'program_id' => $pKubar->id, 'educational_institution_id' => $instKubar->id, 'education_id' => $edUlya->id, 'education_class_id' => $clsUly1->id, 'homeroom_teacher_id' => $t4?->id, 'capacity' => 35, 'classroom_id' => $rUly1?->id],

            // ── TIBYAN: JENJANG TAKHOSSUS ──
            ['code' => 'TK-1A', 'name' => 'Takhossus 1 A', 'program_id' => $pTibyan->id, 'educational_institution_id' => $instTibyan->id, 'education_id' => $edTakhossus->id, 'education_class_id' => $clsTk1->id, 'homeroom_teacher_id' => $t1?->id, 'capacity' => 30, 'classroom_id' => $rTk1?->id],
            ['code' => 'TK-1B', 'name' => 'Takhossus 1 B', 'program_id' => $pTibyan->id, 'educational_institution_id' => $instTibyan->id, 'education_id' => $edTakhossus->id, 'education_class_id' => $clsTk1->id, 'homeroom_teacher_id' => $t2?->id, 'capacity' => 30, 'classroom_id' => $rTk2?->id],
            ['code' => 'TK-2A', 'name' => 'Takhossus 2 A', 'program_id' => $pTibyan->id, 'educational_institution_id' => $instTibyan->id, 'education_id' => $edTakhossus->id, 'education_class_id' => $clsTk2->id, 'homeroom_teacher_id' => $t3?->id, 'capacity' => 30, 'classroom_id' => $rTk1?->id],
            ['code' => 'TK-2B', 'name' => 'Takhossus 2 B', 'program_id' => $pTibyan->id, 'educational_institution_id' => $instTibyan->id, 'education_id' => $edTakhossus->id, 'education_class_id' => $clsTk2->id, 'homeroom_teacher_id' => $t4?->id, 'capacity' => 30, 'classroom_id' => $rTk2?->id],
        ];

        // Hapus rombel dummy lama yang tidak berelasi
        ClassGroup::whereNotIn('code', array_column($groups, 'code'))->forceDelete();

        foreach ($groups as $g) {
            ClassGroup::updateOrCreate(
                ['code' => $g['code'], 'academic_year_id' => $tahun->id],
                array_merge($g, [
                    'gender' => 'L',
                    'progression_type' => 'semester',
                    'is_active' => true,
                ])
            );
        }
    }
}
