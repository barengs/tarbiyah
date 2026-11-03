<?php

namespace Database\Seeders;

use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use Illuminate\Database\Seeder;

class AcademicYearSeeder extends Seeder
{
    /**
     * Seeder Kalender Akademik Hijriyah Pesantren Berbasis Triwulan:
     * Tahun Hijriyah: 1446/1447, Type: triwulan, 3 Kuartal (Triwulan I - III).
     */
    public function run(): void
    {
        $tahunHijriyah = AcademicYear::updateOrCreate(
            ['year' => '1446/1447'],
            [
                'type' => 'triwulan',
                'periode' => 'genap',
                'start_date' => '2026-07-08',
                'end_date' => '2027-06-26',
                'active' => true,
                'description' => 'Kalender Akademik Hijriyah 1446/1447 H (Triwulan)',
            ]
        );

        $triwulans = [
            [
                'name' => 'Triwulan I (Muharram - Rabi\'ul Awwal)',
                'start_date' => '2026-07-08',
                'end_date' => '2026-10-31',
                'active' => false,
            ],
            [
                'name' => 'Triwulan II (Rabi\'ul Akhir - Rajab)',
                'start_date' => '2026-11-01',
                'end_date' => '2027-02-28',
                'active' => false,
            ],
            [
                'name' => 'Triwulan III (Sya\'ban - Dzulhijjah)',
                'start_date' => '2027-03-01',
                'end_date' => '2027-06-26',
                'active' => true, // Sedang aktif
            ],
        ];

        foreach ($triwulans as $t) {
            AcademicQuarter::updateOrCreate(
                ['academic_year_id' => $tahunHijriyah->id, 'name' => $t['name']],
                $t
            );
        }
    }
}
