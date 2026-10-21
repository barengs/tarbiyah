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
     * Seeder Jadwal Pelajaran Matriks Mingguan Khas Pesantren:
     * Hari: Sabtu s.d Kamis (Jumat Libur), Jam 1 s.d 6 (Pagi s.d Malam).
     */
    public function run(): void
    {
        $tahun    = AcademicYear::where('active', true)->first() ?? AcademicYear::first();
        $rombel7A = ClassGroup::where('code', 'VII-A')->first() ?? ClassGroup::first();
        
        $studies = Study::all()->keyBy('code');
        $teachers = Teacher::all();
        $hours = LessonHour::orderBy('order')->get()->keyBy('order');

        if (!$rombel7A || $studies->isEmpty() || $teachers->isEmpty() || $hours->isEmpty()) {
            return;
        }

        // Hapus jadwal lama rombel ini untuk diisi matriks baru yang proporsional
        LessonSchedule::where('class_group_id', $rombel7A->id)->delete();

        $t1 = $teachers[0] ?? null;
        $t2 = $teachers[1] ?? $t1;
        $t3 = $teachers[2] ?? $t1;

        $sFiqih   = Study::where('name', 'like', '%Fiqih%')->first() ?? $studies->first();
        $sNahwu   = Study::where('name', 'like', '%Nahwu%')->first() ?? $studies->first();
        $sTahfidz = Study::where('name', 'like', '%Tahfizh%')->orWhere('name', 'like', '%Tahfidz%')->first() ?? $studies->first();
        $sMath    = Study::where('name', 'like', '%Matematika%')->first() ?? $studies->first();
        $sArab    = Study::where('name', 'like', '%Arab%')->first() ?? $studies->first();
        $sHadits  = Study::where('name', 'like', '%Hadits%')->orWhere('name', 'like', '%Hadis%')->first() ?? $studies->first();

        // Template jadwal: [day, hour_order, study, teacher]
        // Days: 6: Sabtu, 7: Ahad, 1: Senin, 2: Selasa, 3: Rabu, 4: Kamis
        $scheduleMatrix = [
            // SABTU (day: 6)
            [6, 1, $sTahfidz, $t1],
            [6, 2, $sFiqih,   $t1],
            [6, 3, $sMath,    $t2],
            [6, 4, $sNahwu,   $t3],
            [6, 5, $sTahfidz, $t1],
            [6, 6, $sArab,    $t3],

            // AHAD (day: 7)
            [7, 1, $sTahfidz, $t1],
            [7, 2, $sArab,    $t3],
            [7, 3, $sFiqih,   $t1],
            [7, 4, $sHadits,  $t2],
            [7, 5, $sTahfidz, $t1],

            // SENIN (day: 1)
            [1, 1, $sFiqih,   $t1],
            [1, 2, $sMath,    $t2],
            [1, 3, $sArab,    $t3],
            [1, 4, $sNahwu,   $t3],
            [1, 5, $sTahfidz, $t1],
            [1, 6, $sHadits,  $t2],

            // SELASA (day: 2)
            [2, 1, $sTahfidz, $t1],
            [2, 2, $sNahwu,   $t3],
            [2, 3, $sFiqih,   $t1],
            [2, 4, $sMath,    $t2],
            [2, 5, $sTahfidz, $t1],

            // RABU (day: 3)
            [3, 1, $sArab,    $t3],
            [3, 2, $sHadits,  $t2],
            [3, 3, $sMath,    $t2],
            [3, 4, $sFiqih,   $t1],
            [3, 5, $sTahfidz, $t1],
            [3, 6, $sNahwu,   $t3],

            // KAMIS (day: 4)
            [4, 1, $sTahfidz, $t1],
            [4, 2, $sFiqih,   $t1],
            [4, 3, $sArab,    $t3],
            [4, 4, $sHadits,  $t2],
        ];

        foreach ($scheduleMatrix as $item) {
            [$day, $hourOrder, $study, $teacher] = $item;
            $h = $hours[$hourOrder] ?? null;
            if (!$h || !$study || !$teacher) continue;

            LessonSchedule::create([
                'academic_year_id' => $tahun->id,
                'class_group_id'   => $rombel7A->id,
                'study_id'         => $study->id,
                'teacher_id'       => $teacher->id,
                'lesson_hour_id'   => $h->id,
                'day'              => $day,
                'is_active'        => true,
            ]);
        }

        // Seeder Jurnal KBM
        $firstSched = LessonSchedule::where('class_group_id', $rombel7A->id)->first();
        if ($firstSched) {
            $journal = TeachingJournal::firstOrCreate([
                'academic_year_id' => $tahun->id,
                'class_group_id'   => $rombel7A->id,
                'study_id'         => $firstSched->study_id,
                'meeting_number'   => 1,
                'date'             => '2026-08-01',
            ], [
                'teacher_id'     => $firstSched->teacher_id,
                'topic'          => "Pertemuan Perdana: Orientasi Kitab & Silabus",
                'notes'          => "Santri menyimak dengan antusias pembagian bab kajian.",
                'teacher_status' => 'hadir',
            ]);

            $students = Student::all();
            foreach ($students as $st) {
                StudentPresence::firstOrCreate([
                    'teaching_journal_id' => $journal->id,
                    'student_id'          => $st->id,
                ], ['status' => 'hadir']);
            }
        }
    }
}
