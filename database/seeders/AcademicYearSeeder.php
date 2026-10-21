<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AcademicYear;
use App\Models\AcademicQuarter;

class AcademicYearSeeder extends Seeder
{
    /**
     * Seeder Kalender Akademik Hijriyah Pesantren Berbasis Triwulan:
     * Tahun Hijriyah: 1446/1447, Type: triwulan, 4 Kuartal (Triwulan I - IV).
     */
    public function run(): void
    {
        $tahunHijriyah = AcademicYear::updateOrCreate(
            ['year' => '1446/1447'],
            [
                'type'        => 'triwulan',
                'periode'     => 'genap',
                'start_date'  => '2026-07-08',
                'end_date'    => '2027-06-26',
                'active'      => true,
                'description' => 'Kalender Akademik Hijriyah 1446/1447 H (Triwulan)',
            ]
        );

        $triwulans = [
            [
                'name'       => 'Triwulan I (Muharram - Rabi\'ul Awwal)',
                'start_date' => '2026-07-08',
                'end_date'   => '2026-10-04',
                'active'     => false,
            ],
            [
                'name'       => 'Triwulan II (Rabi\'ul Akhir - Jumadil Akhir)',
                'start_date' => '2026-10-05',
                'end_date'   => '2026-12-31',
                'active'     => false,
            ],
            [
                'name'       => 'Triwulan III (Rajab - Ramadhan)',
                'start_date' => '2027-01-01',
                'end_date'   => '2027-03-29',
                'active'     => false,
            ],
            [
                'name'       => 'Triwulan IV (Syawal - Dzulhijjah)',
                'start_date' => '2027-03-30',
                'end_date'   => '2027-06-26',
                'active'     => true, // Sedang aktif
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
