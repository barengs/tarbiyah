<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\LessonHour;
use App\Models\LessonSchedule;

class LessonHourSeeder extends Seeder
{
    /**
     * Seeder Jam Pelajaran Pesantren: 6 Kali Sehari dari Pagi hingga Malam.
     */
    public function run(): void
    {
        DB::table('lesson_schedules')->delete();
        DB::table('lesson_hours')->delete();

        $hours = [
            [
                'id'         => 1,
                'name'       => 'Jam Ke-1 (Pagi Awal)',
                'start_time' => '07:00:00',
                'end_time'   => '08:30:00',
                'order'      => 1,
                'is_break'   => false,
            ],
            [
                'id'         => 2,
                'name'       => 'Jam Ke-2 (Pagi Lanjutan)',
                'start_time' => '09:00:00',
                'end_time'   => '11:30:00',
                'order'      => 2,
                'is_break'   => false,
            ],
            [
                'id'         => 3,
                'name'       => 'Jam Ke-3 (Siang / Dhuhur)',
                'start_time' => '13:00:00',
                'end_time'   => '14:30:00',
                'order'      => 3,
                'is_break'   => false,
            ],
            [
                'id'         => 4,
                'name'       => 'Jam Ke-4 (Sore / Ashar)',
                'start_time' => '15:45:00',
                'end_time'   => '17:00:00',
                'order'      => 4,
                'is_break'   => false,
            ],
            [
                'id'         => 5,
                'name'       => 'Jam Ke-5 (Ba\'da Maghrib)',
                'start_time' => '18:30:00',
                'end_time'   => '19:30:00',
                'order'      => 5,
                'is_break'   => false,
            ],
            [
                'id'         => 6,
                'name'       => 'Jam Ke-6 (Malam / Ba\'da Isya)',
                'start_time' => '20:00:00',
                'end_time'   => '21:30:00',
                'order'      => 6,
                'is_break'   => false,
            ],
        ];

        foreach ($hours as $h) {
            LessonHour::create($h);
        }
    }
}
