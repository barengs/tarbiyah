<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\AssessmentCategory;
use App\Models\EducationalInstitution;

class StudySeeder extends Seeder
{
    /**
     * Seeder 3 Jenis Mata Pelajaran:
     * 1. khusus       : Mata Pelajaran Khusus (Masuk Jadwal KBM, Penentu Kenaikan & Wajib Remidi bila < KKM)
     * 2. reguler      : Mata Pelajaran Reguler (Masuk Jadwal KBM)
     * 3. muatan_lokal : Mata Pelajaran Non-Kelas / Muatan Lokal (Tidak masuk Jadwal KBM, memiliki nilai akhir triwulan sebagai penunjang)
     */
    public function run(): void
    {
        $instKubar = EducationalInstitution::where('short_name', 'Kubar')->first()
            ?? EducationalInstitution::first();

        $guruFiqih = Teacher::where('nip', '198501012010011001')->first();
        $guruMath  = Teacher::where('nip', '199203152018022002')->first();
        $guruKitab = Teacher::where('nip', '199008202015031003')->first();

        // ── 1. MATA PELAJARAN KHUSUS (MASUK JADWAL KBM • WAJIB TUNTAS / REMIDI) ──
        $fiqih = Study::updateOrCreate(
            ['code' => 'FQH-07'],
            [
                'name'                       => 'Fiqih Ibadah (Fathul Qarib)',
                'study_type'                 => 'khusus',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 75.00,
                'order'                      => 1,
                'description'                => 'Mata Pelajaran Khusus (Inti Dirasah) • Wajib Remidi bila nilai akhir triwulan belum memenuhi KKM',
                'is_active'                  => true,
            ]
        );
        if ($guruFiqih) {
            $fiqih->teachers()->syncWithoutDetaching([$guruFiqih->id]);
        }

        $nahwu = Study::updateOrCreate(
            ['code' => 'NHW-01'],
            [
                'name'                       => 'Nahwu & Shorof (Al-Jurumiyah)',
                'study_type'                 => 'khusus',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 75.00,
                'order'                      => 2,
                'description'                => 'Mata Pelajaran Khusus (Alat Baca Kitab) • Wajib Remidi bila nilai akhir triwulan belum memenuhi KKM',
                'is_active'                  => true,
            ]
        );
        if ($guruFiqih) {
            $nahwu->teachers()->syncWithoutDetaching([$guruFiqih->id]);
        }

        // ── 2. MATA PELAJARAN REGULER (MASUK JADWAL KBM) ──
        $arab = Study::updateOrCreate(
            ['code' => 'ARB-01'],
            [
                'name'                       => 'Bahasa Arab (Muhadatsah)',
                'study_type'                 => 'reguler',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 70.00,
                'order'                      => 3,
                'description'                => 'Mata Pelajaran Reguler KBM Kelas',
                'is_active'                  => true,
            ]
        );
        if ($guruFiqih) {
            $arab->teachers()->syncWithoutDetaching([$guruFiqih->id]);
        }

        $hadits = Study::updateOrCreate(
            ['code' => 'HDS-01'],
            [
                'name'                       => 'Hadits & Ilmu Hadits',
                'study_type'                 => 'reguler',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 75.00,
                'order'                      => 4,
                'description'                => 'Mata Pelajaran Reguler KBM Kelas',
                'is_active'                  => true,
            ]
        );
        if ($guruKitab) {
            $hadits->teachers()->syncWithoutDetaching([$guruKitab->id]);
        }

        $math = Study::updateOrCreate(
            ['code' => 'MTK-07'],
            [
                'name'                       => 'Matematika Terapan',
                'study_type'                 => 'reguler',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 70.00,
                'order'                      => 5,
                'description'                => 'Mata Pelajaran Reguler KBM Kelas',
                'is_active'                  => true,
            ]
        );
        if ($guruMath) {
            $math->teachers()->syncWithoutDetaching([$guruMath->id]);
        }

        // ── 3. MATA PELAJARAN NON-KELAS / MUATAN LOKAL (TIDAK MASUK JADWAL • PENUNJANG NILAI) ──
        Study::updateOrCreate(
            ['code' => 'MLK-01'],
            [
                'name'                       => 'Muhadharah & Khitobah (Pidato)',
                'study_type'                 => 'muatan_lokal',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 70.00,
                'order'                      => 6,
                'description'                => 'Muatan Lokal Non-Kelas (Tidak masuk jadwal KBM, dinilai pada akhir triwulan sebagai penunjang nilai)',
                'is_active'                  => true,
            ]
        );

        Study::updateOrCreate(
            ['code' => 'MLK-02'],
            [
                'name'                       => 'Praktek Ubudiyah & Akhlaqul Karimah',
                'study_type'                 => 'muatan_lokal',
                'educational_institution_id' => $instKubar?->id,
                'kkm'                        => 75.00,
                'order'                      => 7,
                'description'                => 'Muatan Lokal Non-Kelas (Tidak masuk jadwal KBM, dinilai pada akhir triwulan sebagai penunjang nilai)',
                'is_active'                  => true,
            ]
        );

        // Nonaktifkan mapel Tahfidz lama jika ada
        Study::where('code', 'TFZ-01')
            ->orWhere('name', 'like', '%Tahfidz%')
            ->orWhere('name', 'like', '%Tahfizh%')
            ->update(['is_active' => false]);
    }
}
