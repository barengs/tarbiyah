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

        // Nama-nama santri asli pesantren
        $santriNames = [
            'ACH ROSIDI',
            'ABD KHOLIK IRWANSYAH',
            'AHMAD FIDHADINILLAH',
            'ACHMAD HASAN BASRI',
            'AHMAD KAMIL',
            'ANDRIAN SAPUTRA',
            'RUDI HENDRAWAN',
            'ARIFIN ILHAM',
            'IMAMUDDIN AL-FASIRY',
            'KHOIRUDDIN ANWAR',
            'MASKUR JAMIL',
            'MOH. IBNU AGEL',
            'MOH IQBAL HAQIQI',
            'MOH RIZKI YANTO IRAWAN',
            'SAHRUL GUNAWAN',
            'ZAKI AL HABZY',
            'ACH BAHRUL WIDAD',
            'FIQHUL YAQIN',
            'ACHMAD IKLIL',
            'ALFIAN NUZULA'
        ];

        $waliNames = [
            'H. Abdul Wahid',
            'H. Syamsul Arifin',
            'Drs. H. Maimun Zubair',
            'H. Ahmad Muzakki',
            'H. Marzuki Rahmat',
            'H. Hasan Bisri',
            'H. Mahmud Ali',
            'H. Mansur Syah',
            'H. Khoirul Anam',
            'H. Fathur Rahman',
            'H. Syaifullah',
            'H. Zainal Abidin',
            'H. Munir Hidayat',
            'H. Subhan Nawawi',
            'H. Bahrul Alam',
            'H. Zulkifli Rahman',
            'H. Ridwan Kamil',
            'H. Imron Rosyadi',
            'H. Kholilur Rahman',
            'H. Abdullah Sajjad'
        ];

        $globalIdx = 1;

        foreach ($allGroups as $gIdx => $group) {
            foreach ($santriNames as $idx => $nama) {
                $parts = explode(' ', $nama, 2);
                $firstName = $parts[0];
                $lastName = $parts[1] ?? '';

                // Format NIS pesantrean: 14460197XXX (1446 = Hijri, 0197 = Kode Lembaga, XXX = Sequence)
                $nis = '14460197' . str_pad($globalIdx, 3, '0', STR_PAD_LEFT);
                $nikSantri = '3528' . str_pad($globalIdx, 12, '1', STR_PAD_LEFT);
                $nikWali = '3528' . str_pad($globalIdx + 500, 12, '2', STR_PAD_LEFT);
                $kk = '3528' . str_pad($globalIdx + 100, 12, '3', STR_PAD_LEFT);

                $waliName = $waliNames[$idx % count($waliNames)];

                $student = Student::updateOrCreate(
                    ['nis' => $nis],
                    [
                        'santri_id'     => $globalIdx,
                        'parent_id'     => $nikWali, // NIK Wali Santri (FK ke parent_profiles.nik di smpt)
                        'period'        => '1446 H / 2024',
                        'nik'           => $nikSantri,
                        'kk'            => $kk,
                        'first_name'    => $firstName,
                        'last_name'     => $lastName,
                        'name'          => $nama,
                        'gender'        => 'L',
                        'is_mukim'      => true,
                        'born_in'       => 'Pamekasan',
                        'born_at'       => '2010-05-15',
                        'last_education'=> 'MI Tarbiyatul Islamiyah',
                        'village_id'    => 3528010001, // Identifikasi wilayah NIK via Laravolt Indonesia
                        'village'       => 'Panyeppen',
                        'district'      => 'Palengaan',
                        'postal_code'   => '69362',
                        'address'       => 'Pondok Pesantren Miftahul Ulum Panyeppen, Palengaan',
                        'phone'         => '081' . rand(100000000, 999999999),
                        'parent_name'   => $waliName,
                        'parent_phone'  => '082' . rand(100000000, 999999999),
                        'hostel_id'     => 1,
                        'program_id'    => ($gIdx % 2 === 0) ? 1 : 2,
                        'status'        => 'Aktif',
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

                $globalIdx++;
            }
        }
    }
}
