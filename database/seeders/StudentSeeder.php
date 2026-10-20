<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\ClassGroup;
use App\Models\AcademicYear;

class StudentSeeder extends Seeder
{
    /**
     * Seeder data siswa / santri:
     *  - Santri Mukim (~90%): terikat asrama pesantren & memiliki santri_id
     *  - Siswa Reguler Luar (~10%): siswa non-mukim (kalong) yang hanya bersekolah
     */
    public function run(): void
    {
        $tahun           = AcademicYear::where('active', true)->first();
        $rombel7A        = ClassGroup::where('code', 'VII-A')->first();
        $halaqahAbuBakar = ClassGroup::where('code', 'HLQ-ABUBAKAR')->first();

        // ── 1. Santri Mukim Pesantren (90%) ──
        $santriMukim = [
            ['nis' => '2026001', 'name' => 'Ahmad Fathan Al-Ghifari', 'gender' => 'L', 'santri_id' => 101],
            ['nis' => '2026002', 'name' => 'Muhammad Bilal Al-Habsyi', 'gender' => 'L', 'santri_id' => 102],
            ['nis' => '2026003', 'name' => 'Zaidan Akram Mumtaz',     'gender' => 'L', 'santri_id' => 103],
            ['nis' => '2026004', 'name' => 'Rayhan Pratama Putra',    'gender' => 'L', 'santri_id' => 104],
        ];

        foreach ($santriMukim as $s) {
            $st = Student::updateOrCreate(
                ['nis' => $s['nis']],
                [
                    'santri_id'    => $s['santri_id'],
                    'name'         => $s['name'],
                    'gender'       => $s['gender'],
                    'is_mukim'     => true, // Santri Mukim
                    'parent_name'  => 'H. Abdullah',
                    'parent_phone' => '081399887766',
                    'address'      => 'Asrama Al-Ghazali Kamar 04',
                    'status'       => 'aktif',
                ]
            );

            // Masukkan ke Rombel Formal VII-A
            if ($rombel7A) {
                StudentClass::firstOrCreate([
                    'academic_year_id'           => $tahun->id,
                    'educational_institution_id' => $rombel7A->educational_institution_id,
                    'student_id'                 => $st->id,
                    'class_group_id'             => $rombel7A->id,
                ], ['status' => 'aktif', 'joined_at' => '2026-07-15']);
            }

            // Masukkan ke Halaqah Tahfidz Abu Bakar
            if ($halaqahAbuBakar) {
                StudentClass::firstOrCreate([
                    'academic_year_id'           => $tahun->id,
                    'educational_institution_id' => $halaqahAbuBakar->educational_institution_id,
                    'student_id'                 => $st->id,
                    'class_group_id'             => $halaqahAbuBakar->id,
                ], ['status' => 'aktif', 'joined_at' => '2026-07-15']);
            }
        }

        // ── 2. Siswa Reguler Luar / Kalong (10%) ──
        $siswaLuar = [
            ['nis' => '2026005', 'name' => 'Faris Dwi Nugraha (Siswa Luar)',    'gender' => 'L'],
            ['nis' => '2026006', 'name' => 'Dicky Surya Wardhana (Siswa Luar)', 'gender' => 'L'],
        ];

        foreach ($siswaLuar as $s) {
            $st = Student::updateOrCreate(
                ['nis' => $s['nis']],
                [
                    'santri_id'    => null, // Bukan santri mukim
                    'name'         => $s['name'],
                    'gender'       => $s['gender'],
                    'is_mukim'     => false, // Siswa Reguler Luar
                    'parent_name'  => 'Bpk. Budi Santoso',
                    'parent_phone' => '081122334455',
                    'address'      => 'Jl. Perumahan Indah Blok C3 (Pulang-Pergi)',
                    'status'       => 'aktif',
                ]
            );

            if ($rombel7A) {
                StudentClass::firstOrCreate([
                    'academic_year_id'           => $tahun->id,
                    'educational_institution_id' => $rombel7A->educational_institution_id,
                    'student_id'                 => $st->id,
                    'class_group_id'             => $rombel7A->id,
                ], ['status' => 'aktif', 'joined_at' => '2026-07-15']);
            }
        }
    }
}
