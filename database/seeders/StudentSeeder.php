<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\AcademicYear;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();
        $allGroups = ClassGroup::all();

        // 20 nama santri persis seperti nama-nama santri di sistem pesantren (mirip screenshot)
        $santriNames = [
            'ACH ROSIDI',
            'ABD KHOLIK IRWANSYAH',
            'AHMAD FIDHADINILLAH',
            'ACHMAD HASAN BASRI',
            'AHMAD KAMIL',
            'ANDRIAN',
            'RUDI HENDRAWAN',
            'ARIFIN',
            'IMAMUDDIN',
            'KHOIRUDDIN',
            'MASKUR JAMIL',
            'MOH. IBNU AGEL',
            'MOH IQBAL HAQIQI',
            'MOH RIZKI YANTO IRAWAN',
            'SAHRUL GUNAWAN',
            'ZAKI AL HABZY',
            'ACH BAHRUL WIDAD',
            'FIQHUL Y',
            'ACHMAD IKLIL',
            'ALFIAN NUZULA'
        ];

        foreach ($allGroups as $group) {
            foreach ($santriNames as $idx => $nama) {
                $nis = 'NIS-' . $group->code . '-' . str_pad($idx + 1, 3, '0', STR_PAD_LEFT);
                $nisn = '00' . rand(10000000, 99999999);

                $student = Student::updateOrCreate(
                    ['nis' => $nis],
                    [
                        'nisn'          => $nisn,
                        'nik'           => '3528' . rand(100000000000, 999999999999),
                        'name'          => $nama,
                        'gender'        => 'L',
                        'born_in'       => 'Pamekasan',
                        'born_at'       => '2010-05-15',
                        'address'       => 'Panyeppen, Palengaan, Pamekasan',
                        'status'        => 'aktif',
                        'is_mukim'      => true,
                    ]
                );

                StudentClass::updateOrCreate(
                    [
                        'academic_year_id' => $tahun->id,
                        'class_group_id'   => $group->id,
                        'student_id'       => $student->id,
                    ],
                    [
                        'educational_institution_id' => $group->educational_institution_id,
                        'status'    => 'aktif',
                        'joined_at' => '2024-07-15',
                    ]
                );
            }
        }
    }
}
