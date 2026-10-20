<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\AssessmentCategory;

class StudySeeder extends Seeder
{
    /**
     * Seeder Mata Pelajaran + relasi guru pengampu + kategori penilaian.
     */
    public function run(): void
    {
        $mts     = \App\Models\EducationalInstitution::where('short_name', 'MTs')->first();
        $tahfidz = \App\Models\EducationalInstitution::where('short_name', 'Tahfidz')->first();

        $guruFiqih   = Teacher::where('nip', '198501012010011001')->first();
        $guruMath    = Teacher::where('nip', '199203152018022002')->first();
        $musyrif     = Teacher::where('nip', '199008202015031003')->first();

        // Mapel Formal
        $fiqih = Study::firstOrCreate(
            ['code' => 'FQH-07'],
            [
                'name'                       => 'Fiqih Ibadah',
                'educational_institution_id' => $mts?->id,
                'kkm'                        => 75.00,
                'order'                      => 1,
            ]
        );
        $fiqih->teachers()->syncWithoutDetaching([$guruFiqih?->id]);

        $math = Study::firstOrCreate(
            ['code' => 'MTK-07'],
            [
                'name'                       => 'Matematika Terapan',
                'educational_institution_id' => $mts?->id,
                'kkm'                        => 70.00,
                'order'                      => 2,
            ]
        );
        $math->teachers()->syncWithoutDetaching([$guruMath?->id]);

        // Mapel Tahfidz
        $tfz = Study::firstOrCreate(
            ['code' => 'TFZ-01'],
            [
                'name'                       => "Tahfidz & Tajwid Al-Qur'an",
                'educational_institution_id' => $tahfidz?->id,
                'kkm'                        => 80.00,
                'order'                      => 1,
            ]
        );
        $tfz->teachers()->syncWithoutDetaching([$musyrif?->id]);

        // Kategori Penilaian (bobot digunakan kalkulasi rapor)
        AssessmentCategory::firstOrCreate(['code' => 'tugas'], ['name' => 'Tugas Harian',      'weight' => 30.00]);
        AssessmentCategory::firstOrCreate(['code' => 'uts'],   ['name' => 'UTS / PTS',         'weight' => 30.00]);
        AssessmentCategory::firstOrCreate(['code' => 'uas'],   ['name' => 'UAS / PAS',         'weight' => 40.00]);
        AssessmentCategory::firstOrCreate(['code' => 'praktik'],['name' => 'Ujian Praktik',    'weight' => 0.00]);
        AssessmentCategory::firstOrCreate(['code' => 'tahfidz'],['name' => "Tasmi' & Setoran", 'weight' => 0.00]);
    }
}
