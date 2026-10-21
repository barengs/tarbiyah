<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\ClassGroup;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\AcademicYear;
use App\Models\Teacher;
use App\Models\Classroom;

class ClassGroupSeeder extends Seeder
{
    /**
     * Seeder Rombel dengan Hierarki Program Pesantren:
     * - Program KUBAR:
     *   - Jenjang Ula:  Rombel Ula 1A, Ula 1B, Ula 2A
     *   - Jenjang Wustha: Rombel Wustha 1A, Wustha 1B, Wustha 2A
     *   - Jenjang Ulya: Rombel Ulya 1A, Ulya 1B
     * - Program TIBYAN:
     *   - Jenjang Takhossus: Rombel Takhossus 1A, Takhossus 1B, Takhossus 2A, Takhossus 2B
     */
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();

        $kubar  = EducationalInstitution::where('short_name', 'Kubar')->first();
        $tibyan = EducationalInstitution::where('short_name', 'Tibyan')->first();

        $ula     = Education::where('name', 'Ula')->first();
        $wustha  = Education::where('name', 'Wustha')->first();
        $ulya    = Education::where('name', 'Ulya')->first();
        $takh    = Education::where('name', 'Takhossus')->first();

        $teachers = Teacher::where('is_active', true)->orderBy('id')->get();
        $t1 = $teachers[0] ?? null;
        $t2 = $teachers[1] ?? $t1;
        $t3 = $teachers[2] ?? $t1;
        $t4 = $teachers[count($teachers) - 1];

        $roomUla1   = Classroom::where('code', 'R-ULA1')->first();
        $roomWustha1 = Classroom::where('code', 'R-WST1')->first();
        $roomUlya1  = Classroom::where('code', 'R-ULY1')->first();
        $roomTakh1  = Classroom::where('code', 'R-TK1')->first();
        $roomTakh2  = Classroom::where('code', 'R-TK2')->first();

        $groups = [
            // ── PROGRAM KUBAR: JENJANG ULA ──
            ['code' => 'ULA-1A', 'name' => 'Ula 1A', 'educational_institution_id' => $kubar?->id, 'education_id' => $ula?->id, 'homeroom_teacher_id' => $t1?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomUla1?->id],
            ['code' => 'ULA-1B', 'name' => 'Ula 1B', 'educational_institution_id' => $kubar?->id, 'education_id' => $ula?->id, 'homeroom_teacher_id' => $t2?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomUla1?->id],
            ['code' => 'ULA-2A', 'name' => 'Ula 2A', 'educational_institution_id' => $kubar?->id, 'education_id' => $ula?->id, 'homeroom_teacher_id' => $t3?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomUla1?->id],

            // ── PROGRAM KUBAR: JENJANG WUSTHA ──
            ['code' => 'WST-1A', 'name' => 'Wustha 1A', 'educational_institution_id' => $kubar?->id, 'education_id' => $wustha?->id, 'homeroom_teacher_id' => $t1?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomWustha1?->id],
            ['code' => 'WST-1B', 'name' => 'Wustha 1B', 'educational_institution_id' => $kubar?->id, 'education_id' => $wustha?->id, 'homeroom_teacher_id' => $t2?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomWustha1?->id],
            ['code' => 'WST-2A', 'name' => 'Wustha 2A', 'educational_institution_id' => $kubar?->id, 'education_id' => $wustha?->id, 'homeroom_teacher_id' => $t3?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomWustha1?->id],

            // ── PROGRAM KUBAR: JENJANG ULYA ──
            ['code' => 'ULY-1A', 'name' => 'Ulya 1A', 'educational_institution_id' => $kubar?->id, 'education_id' => $ulya?->id, 'homeroom_teacher_id' => $t1?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomUlya1?->id],
            ['code' => 'ULY-1B', 'name' => 'Ulya 1B', 'educational_institution_id' => $kubar?->id, 'education_id' => $ulya?->id, 'homeroom_teacher_id' => $t4?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 35, 'classroom_id' => $roomUlya1?->id],

            // ── PROGRAM TIBYAN: JENJANG TAKHOSSUS ──
            ['code' => 'TK-1A', 'name' => 'Takhossus 1A', 'educational_institution_id' => $tibyan?->id, 'education_id' => $takh?->id, 'homeroom_teacher_id' => $t1?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 30, 'classroom_id' => $roomTakh1?->id],
            ['code' => 'TK-1B', 'name' => 'Takhossus 1B', 'educational_institution_id' => $tibyan?->id, 'education_id' => $takh?->id, 'homeroom_teacher_id' => $t2?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 30, 'classroom_id' => $roomTakh2?->id],
            ['code' => 'TK-2A', 'name' => 'Takhossus 2A', 'educational_institution_id' => $tibyan?->id, 'education_id' => $takh?->id, 'homeroom_teacher_id' => $t3?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 30, 'classroom_id' => $roomTakh1?->id],
            ['code' => 'TK-2B', 'name' => 'Takhossus 2B', 'educational_institution_id' => $tibyan?->id, 'education_id' => $takh?->id, 'homeroom_teacher_id' => $t4?->id, 'gender' => 'L', 'progression_type' => 'semester', 'capacity' => 30, 'classroom_id' => $roomTakh2?->id],
        ];

        foreach ($groups as $g) {
            ClassGroup::updateOrCreate(
                ['code' => $g['code'], 'academic_year_id' => $tahun->id],
                array_merge($g, ['is_active' => true])
            );
        }
    }
}
