<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Http\Controllers\Api\Main\AssessmentController;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\StudentQuarterlyScore;
use App\Models\Study;

class AssessmentSeeder extends Seeder
{
    /**
     * Seeder Nilai Akhir Triwulan (Mapel Khusus, Mapel Reguler, & Penunjang Muatan Lokal)
     * beserta Progres Antar Triwulan dan Contoh Kasus Remidi Mapel Khusus.
     */
    public function run(): void
    {
        $tahun = AcademicYear::where('active', true)->first() ?? AcademicYear::first();
        if (!$tahun) return;

        $quarters = AcademicQuarter::where('academic_year_id', $tahun->id)->orderBy('id')->get();
        if ($quarters->isEmpty()) return;

        $activeQuarter = $quarters->firstWhere('active', true) ?? $quarters->last();
        $prevQuarter   = $quarters->where('id', '<', $activeQuarter->id)->last();

        $studies = Study::where('is_active', true)
            ->where('name', 'not like', '%Tahfidz%')
            ->where('name', 'not like', '%Tahfizh%')
            ->orderByRaw("FIELD(study_type, 'khusus', 'reguler', 'muatan_lokal')")
            ->orderBy('order')
            ->get();

        if ($studies->isEmpty()) return;

        $rombels = ClassGroup::all();

        foreach ($rombels as $rombel) {
            $activeStudents = StudentClass::where('class_group_id', $rombel->id)
                ->where('status', 'aktif')
                ->get();

            if ($activeStudents->isEmpty()) continue;

            foreach ($activeStudents as $sIdx => $sc) {
                foreach ($studies as $mIdx => $study) {
                    // 1. Seed Nilai Triwulan Sebelumnya (untuk melihat Progres Nilai)
                    if ($prevQuarter) {
                        $prevScore = min(92, 72 + (($sIdx * 3 + $mIdx * 2) % 18));
                        StudentQuarterlyScore::updateOrCreate(
                            [
                                'academic_quarter_id' => $prevQuarter->id,
                                'class_group_id'      => $rombel->id,
                                'student_id'          => $sc->student_id,
                                'study_id'            => $study->id,
                            ],
                            [
                                'academic_year_id' => $tahun->id,
                                'original_score'   => $prevScore,
                                'remedial_score'   => null,
                                'final_score'      => $prevScore,
                                'is_remedial'      => false,
                                'notes'            => 'Nilai Akhir Triwulan Sebelumnya',
                            ]
                        );
                    }

                    // 2. Seed Nilai Triwulan Aktif
                    // Buat variasi:
                    // - Santri urutan ke-3 (sIdx % 5 === 2) memiliki nilai Mapel Khusus di bawah KKM (misal 64) -> Perlu Remidi!
                    // - Santri urutan ke-4 (sIdx % 5 === 3) pernah di bawah KKM (65) pada Mapel Khusus tapi sudah Tuntas Remidi (78)!
                    // - Mapel Muatan Lokal (muatan_lokal) memiliki nilai bagus (82-92) sebagai penunjang nilai!
                    if ($study->study_type === 'muatan_lokal') {
                        $origScore  = min(95, 82 + (($sIdx * 2 + $mIdx) % 12));
                        $remScore   = null;
                        $finalScore = $origScore;
                        $isRem      = false;
                        $note       = 'Nilai Penunjang Muatan Lokal (Non-Kelas)';
                    } elseif ($study->study_type === 'khusus' && ($sIdx % 5 === 2) && $mIdx === 0) {
                        // Contoh santri yang WAJIB REMIDI pada Mapel Khusus
                        $origScore  = 64.0;
                        $remScore   = null;
                        $finalScore = 64.0;
                        $isRem      = false;
                        $note       = 'Belum mencapai KKM Mapel Khusus (Wajib Remidi)';
                    } elseif ($study->study_type === 'khusus' && ($sIdx % 5 === 3) && $mIdx === 0) {
                        // Contoh santri yang SUDAH TUNTAS REMIDI pada Mapel Khusus
                        $origScore  = 65.0;
                        $remScore   = 78.0;
                        $finalScore = 78.0;
                        $isRem      = true;
                        $note       = 'Tuntas melalui Remidi Mapel Khusus (65 -> 78)';
                    } else {
                        $origScore  = min(96, 75 + (($sIdx * 4 + $mIdx * 3) % 19));
                        $remScore   = null;
                        $finalScore = $origScore;
                        $isRem      = false;
                        $note       = null;
                    }

                    StudentQuarterlyScore::updateOrCreate(
                        [
                            'academic_quarter_id' => $activeQuarter->id,
                            'class_group_id'      => $rombel->id,
                            'student_id'          => $sc->student_id,
                            'study_id'            => $study->id,
                        ],
                        [
                            'academic_year_id' => $tahun->id,
                            'original_score'   => $origScore,
                            'remedial_score'   => $remScore,
                            'final_score'      => $finalScore,
                            'is_remedial'      => $isRem,
                            'notes'            => $note,
                        ]
                    );
                }
            }

            // Sinkronkan buku rapor triwulan aktif
            $eval = AssessmentController::buildQuarterlyEvaluation($rombel, $tahun->id, $activeQuarter);
            AssessmentController::syncReportCardsFromEvaluation($eval, $activeQuarter);
        }
    }
}
