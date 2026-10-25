<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Assessment;
use App\Models\AssessmentCategory;
use App\Models\AssessmentScore;
use App\Models\Student;
use App\Models\ClassGroup;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\AcademicYear;

class AssessmentSeeder extends Seeder
{
    /**
     * Seeder Asesmen (Tugas / Ujian) + Lembar Nilai Siswa.
     */
    public function run(): void
    {
        $tahun      = AcademicYear::where('active', true)->first();
        $rombel7A   = ClassGroup::where('code', 'VII-A')->first();
        $studyFiqih = Study::where('code', 'FQH-07')->first();
        $guruFiqih  = Teacher::where('nip', '198501012010011001')->first();
        $catTugas   = AssessmentCategory::where('code', 'tugas')->first();

        if (!$rombel7A || !$studyFiqih || !$guruFiqih || !$catTugas) return;

        // ── 1. Asesmen: Ulangan Harian 1 ──
        $assessment = Assessment::firstOrCreate([
            'academic_year_id' => $tahun->id,
            'class_group_id'   => $rombel7A->id,
            'study_id'         => $studyFiqih->id,
            'title'            => 'Ulangan Harian 1: Taharah',
        ], [
            'teacher_id'  => $guruFiqih->id,
            'category_id' => $catTugas->id,
            'date'        => '2026-08-20',
            'max_score'   => 100.00,
        ]);

        // ── 2. Nilai Siswa (Hanya jika siswa sudah ada dari penarikan SMPT) ──
        $students = Student::all();
        if ($students->isEmpty()) {
            return;
        }

        foreach ($students as $idx => $st) {
            $baseScore = 85 + ($idx % 3) * 5;
            AssessmentScore::firstOrCreate([
                'assessment_id' => $assessment->id,
                'student_id'    => $st->id,
            ], [
                'score'    => $baseScore,
                'feedback' => 'Pemahaman dalil sangat baik.',
            ]);
        }
    }
}
