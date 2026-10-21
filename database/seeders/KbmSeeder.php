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
     * Seeder Komprehensif Jadwal Pelajaran Pesantren untuk SEMUA ROMBEL.
     * Hari: Sabtu (6), Ahad (7), Senin (1), Selasa (2), Rabu (3), Kamis (4).
     * 6 Sesi Jam per Hari: Pagi s.d Malam.
     */
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();
        if (!$tahun) return;

        $rombels = ClassGroup::all();
        $teachers = Teacher::where('is_active', true)->orderBy('id')->get();
        $hours = LessonHour::orderBy('order')->get()->keyBy('order');

        if ($rombels->isEmpty() || $teachers->isEmpty() || $hours->isEmpty()) {
            return;
        }

        $tAhmad = $teachers->firstWhere('name', 'like', '%Ahmad Zaki%');
        $tHannan = $teachers->firstWhere('name', 'like', '%Hannan%');
        $tRahmah = $teachers->firstWhere('name', 'like', '%Rahmah%');

        $t1 = $tHannan ?? $teachers[0];
        $t2 = $tAhmad ?? $teachers[0];
        $t3 = $tRahmah ?? $teachers[0];
        $t4 = $teachers[count($teachers) - 1];

        $studies = Study::all()->keyBy('code');
        $sFiqih   = Study::where('name', 'like', '%Fiqih%')->first() ?? $studies->first();
        $sNahwu   = Study::where('name', 'like', '%Nahwu%')->first() ?? $studies->first();
        $sTahfidz = Study::where('name', 'like', '%Tahfidz%')->orWhere('name', 'like', '%Tahfizh%')->first() ?? $studies->first();
        $sMath    = Study::where('name', 'like', '%Matematika%')->first() ?? $studies->first();
        $sArab    = Study::where('name', 'like', '%Arab%')->first() ?? $studies->first();
        $sHadits  = Study::where('name', 'like', '%Hadits%')->orWhere('name', 'like', '%Hadis%')->first() ?? $studies->first();
        $sTajwid  = Study::where('name', 'like', '%Tajwid%')->orWhere('name', 'like', '%Tahsin%')->first() ?? $studies->first();

        // Hapus jadwal rombel untuk dimuat ulang
        foreach ($rombels as $rombel) {
            LessonSchedule::where('class_group_id', $rombel->id)->forceDelete();
        }

        $scheduleTemplates = [];

        foreach ($rombels as $rombel) {
            $rombelHasTahfidz = $rombel->progression_type === 'leveling';

            if ($rombelHasTahfidz) {
                // TAHFIDZ TEMPLATE (MUSYARIF / HALAQAH)
                $scheduleTemplates[$rombel->id] = [
                    // [day, hour_order, study, teacher, classroom]
                    // SABTU (6)
                    [6, 1, $sTajwid, $t1, 1],
                    [6, 2, $sTahfidz, $t1, 1],
                    [6, 3, $sFiqih, $t2, 2],
                    [6, 4, $sHadits, $t2, 2],
                    [6, 5, $sTahfidz, $t1, 3],
                    [6, 6, $sTajwid, $t1, 4],
                    // AHAD (7)
                    [7, 1, $sTahfidz, $t1, 1],
                    [7, 2, $sNahwu, $t2, 2],
                    [7, 3, $sArab, $t2, 2],
                    [7, 4, $sTahfidz, $t1, 3],
                    [7, 5, $sTajwid, $t1, 4],
                    [7, 6, $sHadits, $t2, 5],
                    // SENIN (1)
                    [1, 1, $sTajwid, $t1, 1],
                    [1, 2, $sTahfidz, $t1, 2],
                    [1, 3, $sMath, $t3, 2],
                    [1, 4, $sArab, $t2, 3],
                    [1, 5, $sTahfidz, $t1, 4],
                    [1, 6, $sNahwu, $t2, 5],
                    // SELASA (2)
                    [2, 1, $sTahfidz, $t1, 1],
                    [2, 2, $sFiqih, $t2, 2],
                    [2, 3, $sArab, $t2, 2],
                    [2, 4, $sTajwid, $t1, 3],
                    [2, 5, $sTahfidz, $t1, 4],
                    [2, 6, $sHadits, $t2, 5],
                    // RABU (3)
                    [3, 1, $sTajwid, $t1, 1],
                    [3, 2, $sTahfidz, $t1, 2],
                    [3, 3, $sMath, $t3, 2],
                    [3, 4, $sTahfidz, $t1, 3],
                    [3, 5, $sNahwu, $t2, 4],
                    [3, 6, $sArab, $t2, 5],
                    // KAMIS (4)
                    [4, 1, $sTahfidz, $t1, 1],
                    [4, 2, $sFiqih, $t2, 2],
                    [4, 3, $sArab, $t2, 2],
                    [4, 4, $sTajwid, $t1, 3],
                    [4, 5, $sTahfidz, $t1, 4],
                ];
            } else {
                // KELAS FORMAL / DINIYAH BIASA
                $scheduleTemplates[$rombel->id] = [
                    // SABTU (6)
                    [6, 1, $sTajwid, $t1, 6],
                    [6, 2, $sFiqih, $t2, 6],
                    [6, 3, $sMath, $t3, 6],
                    [6, 4, $sNahwu, $t2, 6],
                    [6, 5, $sTahfidz, $t1, 6],
                    [6, 6, $sArab, $t2, 6],
                    // AHAD (7)
                    [7, 1, $sTahfidz, $t1, 6],
                    [7, 2, $sArab, $t2, 6],
                    [7, 3, $sFiqih, $t2, 6],
                    [7, 4, $sHadits, $t2, 6],
                    [7, 5, $sTahfidz, $t1, 6],
                    // SENIN (1)
                    [1, 1, $sFiqih, $t2, 6],
                    [1, 2, $sMath, $t3, 6],
                    [1, 3, $sArab, $t2, 6],
                    [1, 4, $sNahwu, $t2, 6],
                    [1, 5, $sTahfidz, $t1, 6],
                    [1, 6, $sHadits, $t2, 6],
                    // SELASA (2)
                    [2, 1, $sTahfidz, $t1, 6],
                    [2, 2, $sNahwu, $t2, 6],
                    [2, 3, $sFiqih, $t2, 6],
                    [2, 4, $sMath, $t3, 6],
                    [2, 5, $sTajwid, $t1, 6],
                    // RABU (3)
                    [3, 1, $sArab, $t2, 6],
                    [3, 2, $sHadits, $t2, 6],
                    [3, 3, $sMath, $t3, 6],
                    [3, 4, $sFiqih, $t2, 6],
                    [3, 5, $sTahfidz, $t1, 6],
                    [3, 6, $sNahwu, $t2, 6],
                    // KAMIS (4)
                    [4, 1, $sTahfidz, $t1, 6],
                    [4, 2, $sFiqih, $t2, 6],
                    [4, 3, $sArab, $t2, 6],
                    [4, 4, $sHadits, $t2, 6],
                    [4, 5, $sTajwid, $t1, 6],
                ];
            }

            foreach ($scheduleTemplates[$rombel->id] as $item) {
                [$day, $hourOrder, $study, $teacher, $classroom] = $item;
                $h = $hours[$hourOrder] ?? null;
                if (!$h || !$study || !$teacher) continue;

                LessonSchedule::create([
                    'academic_year_id' => $tahun->id,
                    'class_group_id'   => $rombel->id,
                    'study_id'         => $study->id,
                    'teacher_id'       => $teacher->id,
                    'lesson_hour_id'   => $h->id,
                    'classroom_id'     => $classroom,
                    'day'              => $day,
                    'is_active'        => true,
                ]);
            }
        }
    }
}
