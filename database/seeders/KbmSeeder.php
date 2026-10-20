<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LessonSchedule;
use App\Models\TeachingJournal;
use App\Models\StudentPresence;
use App\Models\Student;
use App\Models\ClassGroup;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\LessonHour;
use App\Models\AcademicYear;

class KbmSeeder extends Seeder
{
    /**
     * Seeder Jadwal Pelajaran Mingguan + Jurnal Mengajar Guru + Presensi Kehadiran Siswa.
     */
    public function run(): void
    {
        $tahun      = AcademicYear::where('active', true)->first();
        $rombel7A   = ClassGroup::where('code', 'VII-A')->first();
        $studyFiqih = Study::where('code', 'FQH-07')->first();
        $studyMath  = Study::where('code', 'MTK-07')->first();
        $guruFiqih  = Teacher::where('nip', '198501012010011001')->first();
        $guruMath   = Teacher::where('nip', '199203152018022002')->first();
        $hour1      = LessonHour::where('name', 'Jam Ke-1')->first();
        $hour2      = LessonHour::where('name', 'Jam Ke-2')->first();

        if (!$rombel7A || !$studyFiqih || !$guruFiqih || !$hour1) return;

        // ── 1. Jadwal Pelajaran Mingguan ──
        LessonSchedule::firstOrCreate([
            'academic_year_id' => $tahun->id,
            'class_group_id'   => $rombel7A->id,
            'day'              => 1, // Senin
            'lesson_hour_id'   => $hour1->id,
        ], [
            'study_id'   => $studyFiqih->id,
            'teacher_id' => $guruFiqih->id,
            'is_active'  => true,
        ]);

        if ($studyMath && $guruMath && $hour2) {
            LessonSchedule::firstOrCreate([
                'academic_year_id' => $tahun->id,
                'class_group_id'   => $rombel7A->id,
                'day'              => 1, // Senin
                'lesson_hour_id'   => $hour2->id,
            ], [
                'study_id'   => $studyMath->id,
                'teacher_id' => $guruMath->id,
                'is_active'  => true,
            ]);
        }

        // ── 2. Jurnal Pembelajaran Guru ──
        $journal = TeachingJournal::firstOrCreate([
            'academic_year_id' => $tahun->id,
            'class_group_id'   => $rombel7A->id,
            'study_id'         => $studyFiqih->id,
            'meeting_number'   => 1,
            'date'             => '2026-08-03',
        ], [
            'teacher_id'     => $guruFiqih->id,
            'topic'          => "Bab 1: Pengantar Fiqih Taharah & Najis",
            'notes'          => "Santri menyimak dengan baik materi pembagian air mutlak dan musta'mal.",
            'teacher_status' => 'hadir',
        ]);

        // ── 3. Presensi Siswa di Pertemuan Tersebut ──
        $students = Student::all();
        foreach ($students as $st) {
            StudentPresence::firstOrCreate([
                'teaching_journal_id' => $journal->id,
                'student_id'          => $st->id,
            ], ['status' => 'hadir']);
        }
    }
}
