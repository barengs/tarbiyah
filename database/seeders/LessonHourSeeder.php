<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\LessonHour;

class LessonHourSeeder extends Seeder
{
    /**
     * Seeder Jam Pelajaran KBM (termasuk istirahat).
     */
    public function run(): void
    {
        LessonHour::firstOrCreate(['name' => 'Jam Ke-1'], [
            'start_time' => '07:30:00', 'end_time' => '08:15:00', 'order' => 1, 'is_break' => false,
        ]);
        LessonHour::firstOrCreate(['name' => 'Jam Ke-2'], [
            'start_time' => '08:15:00', 'end_time' => '09:00:00', 'order' => 2, 'is_break' => false,
        ]);
        LessonHour::firstOrCreate(['name' => 'Istirahat Pagi'], [
            'start_time' => '09:00:00', 'end_time' => '09:30:00', 'order' => 3, 'is_break' => true,
        ]);
        LessonHour::firstOrCreate(['name' => 'Jam Ke-3'], [
            'start_time' => '09:30:00', 'end_time' => '10:15:00', 'order' => 4, 'is_break' => false,
        ]);
        LessonHour::firstOrCreate(['name' => 'Jam Ke-4'], [
            'start_time' => '10:15:00', 'end_time' => '11:00:00', 'order' => 5, 'is_break' => false,
        ]);
    }
}
