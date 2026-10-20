<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AcademicYear;
use App\Models\AcademicQuarter;

class AcademicYearSeeder extends Seeder
{
    /**
     * Seeder Tahun Ajaran & Semester.
     */
    public function run(): void
    {
        $tahunAjaran = AcademicYear::updateOrCreate(
            ['year' => '2026/2027'],
            [
                'type'        => 'semester',
                'periode'     => 'ganjil',
                'start_date'  => '2026-07-15',
                'end_date'    => '2027-06-30',
                'active'      => true,
                'description' => 'Tahun Ajaran 2026/2027',
            ]
        );

        AcademicQuarter::firstOrCreate(
            ['academic_year_id' => $tahunAjaran->id, 'name' => 'Semester Ganjil'],
            [
                'start_date' => '2026-07-15',
                'end_date'   => '2026-12-20',
                'active'     => true,
            ]
        );
    }
}
