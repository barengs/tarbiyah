<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\Assessment;
use App\Models\AssessmentCategory;
use App\Models\AssessmentScore;
use App\Models\ClassGroup;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\StudentPresence;
use App\Models\StudentQuarterlyScore;
use App\Models\Study;
use App\Models\TeachingJournal;
use App\Services\BankSantriService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AssessmentController extends Controller
{
    /**
     * Petakan nama kuartal (Triwulan I..IV) ke kode standar triwulan_1..4.
     */
    public static function resolveSemesterKey(?AcademicQuarter $quarter, ?string $rawSemester = null): string
    {
        if (!empty($rawSemester)) {
            return $rawSemester;
        }
        if ($quarter) {
            $name = strtoupper($quarter->name);
            if (str_contains($name, 'IV') || str_contains($name, '4')) return 'triwulan_4';
            if (str_contains($name, 'III') || str_contains($name, '3')) return 'triwulan_3';
            if (str_contains($name, 'II') || str_contains($name, '2')) return 'triwulan_2';
            if (str_contains($name, 'I') || str_contains($name, '1')) return 'triwulan_1';
        }
        return 'triwulan_4';
    }

    /**
     * Cari kuartal (triwulan) sebelumnya untuk kalkulasi progres nilai santri.
     */
    public static function findPreviousQuarter(?AcademicQuarter $currentQuarter, int $yearId): ?AcademicQuarter
    {
        if (!$currentQuarter) {
            return null;
        }

        return AcademicQuarter::where('academic_year_id', $yearId)
            ->where('id', '<', $currentQuarter->id)
            ->orderBy('id', 'desc')
            ->first();
    }

    /**
     * Bangun data lembar nilai akhir triwulan, progres nilai, deteksi remidi mapel khusus,
     * dan rekomendasi kenaikan kelas untuk satu rombel.
     */
    public static function buildQuarterlyEvaluation(ClassGroup $classGroup, ?int $yearId = null, ?AcademicQuarter $quarter = null): array
    {
        if ($yearId === null) {
            $yearId = (int) ($classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));
        }

        if ($quarter === null) {
            $quarter = AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                ?? AcademicQuarter::where('active', true)->first()
                ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first();
        }

        $quarterId = $quarter?->id;
        $prevQuarter = self::findPreviousQuarter($quarter, $yearId);

        $students = StudentClass::where('class_group_id', $classGroup->id)
            ->where('status', 'aktif')
            ->with('student')
            ->get()
            ->filter(fn($sc) => $sc->student !== null)
            ->sortBy(fn($sc) => $sc->student->name)
            ->values();

        // Ambil seluruh mata pelajaran aktif (Khusus, Reguler, dan Muatan Lokal Non-Kelas)
        $studies = Study::where(function ($q) use ($classGroup) {
            $q->where('educational_institution_id', $classGroup->educational_institution_id)
              ->orWhereNull('educational_institution_id');
        })
            ->where('is_active', true)
            ->where('name', 'not like', '%Tahfidz%')
            ->where('name', 'not like', '%Tahfizh%')
            ->orderByRaw("FIELD(study_type, 'khusus', 'reguler', 'muatan_lokal')")
            ->orderBy('order', 'asc')
            ->orderBy('name', 'asc')
            ->get();

        // Standar rata-rata minimal kelas (rata-rata dari KKM mapel khusus & reguler, default 73.0)
        $coreStudies = $studies->whereIn('study_type', ['khusus', 'reguler']);
        $minRequiredAverage = $coreStudies->isNotEmpty()
            ? round((float) $coreStudies->avg('kkm'), 1)
            : 73.0;

        // Ambil skor triwulan berjalan untuk rombel ini
        $currentScores = StudentQuarterlyScore::where('class_group_id', $classGroup->id)
            ->when($quarterId, fn($q) => $q->where('academic_quarter_id', $quarterId))
            ->get()
            ->groupBy('student_id');

        // Ambil skor triwulan sebelumnya untuk perhitungan progres nilai
        $prevScoresByStudent = collect();
        if ($prevQuarter) {
            $prevScoresByStudent = StudentQuarterlyScore::where('class_group_id', $classGroup->id)
                ->where('academic_quarter_id', $prevQuarter->id)
                ->get()
                ->groupBy('student_id');
        }

        // Jurnal pertemuan untuk rekap kehadiran triwulan ini
        $journalQuery = TeachingJournal::where('class_group_id', $classGroup->id);
        if ($quarter && $quarter->start_date && $quarter->end_date) {
            $journalQuery->whereBetween('date', [$quarter->start_date, $quarter->end_date]);
        }
        $journalIds = $journalQuery->pluck('id');

        $rows = [];
        foreach ($students as $sc) {
            $sId = $sc->student_id;
            $studentScoreMap = ($currentScores->get($sId) ?? collect())->keyBy('study_id');

            $grades = [];
            $khususScores = [];
            $regulerScores = [];
            $mulokScores = [];
            $allScores = [];
            $remedialStudies = [];
            $completedRemedialCount = 0;

            foreach ($studies as $study) {
                $rec = $studentScoreMap->get($study->id);

                $origScore = $rec && $rec->original_score !== null ? (float) $rec->original_score : null;
                $remScore  = $rec && $rec->remedial_score !== null ? (float) $rec->remedial_score : null;
                $finalScore = $rec && $rec->final_score !== null ? (float) $rec->final_score : $origScore;
                $isRem      = $rec ? (bool) $rec->is_remedial : false;

                $kkmVal = (float) ($study->kkm ?: 65.0);
                $studyType = $study->study_type ?: 'reguler';
                $isPass = $finalScore !== null ? ($finalScore >= $kkmVal) : null;
                $predicate = $finalScore === null
                    ? '-'
                    : ($finalScore >= 90 ? 'A' : ($finalScore >= 80 ? 'B' : ($finalScore >= 70 ? 'C' : 'D')));

                if ($finalScore !== null) {
                    $allScores[] = $finalScore;
                    if ($studyType === 'khusus') {
                        $khususScores[] = $finalScore;
                    } elseif ($studyType === 'muatan_lokal') {
                        $mulokScores[] = $finalScore;
                    } else {
                        $regulerScores[] = $finalScore;
                    }
                }

                if ($isRem && $isPass) {
                    $completedRemedialCount++;
                }

                $grades[$study->id] = [
                    'study_id'       => $study->id,
                    'study_code'     => $study->code,
                    'study_name'     => $study->name,
                    'study_type'     => $studyType,
                    'kkm'            => $kkmVal,
                    'original_score' => $origScore,
                    'remedial_score' => $remScore,
                    'score'          => $finalScore,
                    'is_remedial'    => $isRem,
                    'is_locked'      => $rec ? (bool) $rec->is_locked : false,
                    'locked_at'      => $rec?->locked_at?->toIso8601String(),
                    'is_pass'        => $isPass,
                    'predicate'      => $predicate,
                    'notes'          => $rec?->notes,
                ];
            }

            $hasScores = count($allScores) > 0;
            $overallAverage = $hasScores ? round(array_sum($allScores) / count($allScores), 1) : null;
            $khususAverage  = count($khususScores) > 0 ? round(array_sum($khususScores) / count($khususScores), 1) : null;
            $regulerAverage = count($regulerScores) > 0 ? round(array_sum($regulerScores) / count($regulerScores), 1) : null;
            $mulokAverage   = count($mulokScores) > 0 ? round(array_sum($mulokScores) / count($mulokScores), 1) : null;

            // Hitung rata-rata triwulan sebelumnya & progres nilai
            $prevAvg = null;
            if ($prevQuarter) {
                $prevList = $prevScoresByStudent->get($sId);
                if ($prevList && $prevList->isNotEmpty()) {
                    $prevAvg = round((float) $prevList->avg('final_score'), 1);
                }
            }
            $progressDelta = ($prevAvg !== null && $hasScores)
                ? round($overallAverage - $prevAvg, 1)
                : null;

            // Deteksi Remidi untuk Mata Pelajaran Khusus:
            // Bila rata-rata nilai tidak memenuhi standar (< minRequiredAverage) ATAU ada Mapel Khusus < KKM,
            // maka santri wajib remidi pada Mata Pelajaran Khusus yang nilainya belum optimal / di bawah KKM.
            $averageBelowStandard = $hasScores && ($overallAverage < $minRequiredAverage);

            foreach ($studies->where('study_type', 'khusus') as $spStudy) {
                $gItem = $grades[$spStudy->id] ?? null;
                $scVal = $gItem['score'] ?? null;
                $kkmVal = (float) ($spStudy->kkm ?: 65.0);

                if ($scVal !== null && ($scVal < $kkmVal || ($averageBelowStandard && $scVal < 80))) {
                    $remedialStudies[] = [
                        'study_id'       => $spStudy->id,
                        'study_name'     => $spStudy->name,
                        'study_code'     => $spStudy->code,
                        'kkm'            => $kkmVal,
                        'original_score' => $gItem['original_score'],
                        'remedial_score' => $gItem['remedial_score'],
                        'final_score'    => $scVal,
                        'deficit'        => round(max(0, $kkmVal - $scVal), 1),
                    ];
                }
            }

            $needsRemedial = count($remedialStudies) > 0 || $averageBelowStandard;

            if (!$hasScores) {
                $promotionStatus = 'belum_dinilai';
                $promotionLabel  = 'Belum Dinilai';
            } elseif ($needsRemedial) {
                $promotionStatus = 'remidi_khusus';
                $promotionLabel  = 'Wajib Remidi Mapel Khusus';
            } elseif ($completedRemedialCount > 0) {
                $promotionStatus = 'tuntas_remidi';
                $promotionLabel  = 'Layak Naik (Tuntas Remidi)';
            } else {
                $promotionStatus = 'layak_naik';
                $promotionLabel  = 'Layak Naik Kelas';
            }

            // Rekap Kehadiran
            $hadir = $journalIds->isNotEmpty() ? StudentPresence::whereIn('teaching_journal_id', $journalIds)->where('student_id', $sId)->where('status', 'hadir')->count() : 0;
            $izin  = $journalIds->isNotEmpty() ? StudentPresence::whereIn('teaching_journal_id', $journalIds)->where('student_id', $sId)->where('status', 'izin')->count() : 0;
            $sakit = $journalIds->isNotEmpty() ? StudentPresence::whereIn('teaching_journal_id', $journalIds)->where('student_id', $sId)->where('status', 'sakit')->count() : 0;
            $alpa  = $journalIds->isNotEmpty() ? StudentPresence::whereIn('teaching_journal_id', $journalIds)->where('student_id', $sId)->where('status', 'alpa')->count() : 0;

            $predicateOverall = $hasScores
                ? ($overallAverage >= 90
                    ? 'A (Mumtaz)'
                    : ($overallAverage >= 80
                        ? 'B (Jayyid Jiddan)'
                        : ($overallAverage >= 70
                            ? 'C (Jayyid)'
                            : 'D (Maqbul)')))
                : '-';

            $rows[] = [
                'student_id'               => $sId,
                'student_name'             => $sc->student->name,
                'name'                     => $sc->student->name,
                'student_nis'              => $sc->student->nis,
                'nis'                      => $sc->student->nis,
                'gender'                   => $sc->student->gender,
                'is_mukim'                 => (bool) $sc->student->is_mukim,
                'grades'                   => $grades,
                'scores'                   => $grades,
                'total_score'              => $hasScores ? round(array_sum($allScores), 1) : null,
                'khusus_average'           => $khususAverage,
                'reguler_average'          => $regulerAverage,
                'mulok_average'            => $mulokAverage,
                'average'                  => $overallAverage,
                'previous_average'         => $prevAvg,
                'progress_delta'           => $progressDelta,
                'predicate'                => $predicateOverall,
                'needs_remedial'           => $needsRemedial,
                'remedial_studies'         => $remedialStudies,
                'completed_remedial_count' => $completedRemedialCount,
                'promotion_status'         => $promotionStatus,
                'promotion_label'          => $promotionLabel,
                'attendance'               => [
                    'hadir' => $hadir,
                    'izin'  => $izin,
                    'sakit' => $sakit,
                    'alpa'  => $alpa,
                ],
            ];
        }

        // Hitung peringkat berdasarkan overall average tertinggi
        $ranked = $rows;
        usort($ranked, fn($a, $b) => $b['average'] <=> $a['average']);
        $rankMap = [];
        foreach ($ranked as $idx => $r) {
            $rankMap[$r['student_id']] = $idx + 1;
        }
        foreach ($rows as &$r) {
            $r['rank'] = $rankMap[$r['student_id']] ?? 1;
        }

        // Rekap status kunci nilai per mata pelajaran pada rombel ini
        $studiesLockSummary = [];
        foreach ($studies as $stItem) {
            $gradedCount = 0;
            $lockedCount = 0;
            foreach ($rows as $rowItem) {
                $cell = $rowItem['grades'][$stItem->id] ?? null;
                if ($cell && $cell['score'] !== null) {
                    $gradedCount++;
                    if (!empty($cell['is_locked'])) {
                        $lockedCount++;
                    }
                }
            }
            $studiesLockSummary[$stItem->id] = [
                'study_id'     => $stItem->id,
                'graded_count' => $gradedCount,
                'locked_count' => $lockedCount,
                'is_locked'    => $gradedCount > 0 && $lockedCount === $gradedCount,
                'has_locked'   => $lockedCount > 0,
            ];
        }

        return [
            'class_group'          => $classGroup->name,
            'class_group_info'     => $classGroup,
            'academic_year_id'     => $yearId,
            'academic_quarter_id'  => $quarterId,
            'quarter_name'         => $quarter?->name,
            'prev_quarter_name'    => $prevQuarter?->name,
            'min_required_average' => $minRequiredAverage,
            'studies'              => $studies->values(),
            'studies_lock_summary' => $studiesLockSummary,
            'studies_grouped'      => [
                'khusus'       => $studies->where('study_type', 'khusus')->values(),
                'reguler'      => $studies->where('study_type', 'reguler')->values(),
                'muatan_lokal' => $studies->where('study_type', 'muatan_lokal')->values(),
            ],
            'summary'              => [
                'total_students'  => count($rows),
                'layak_naik'      => collect($rows)->whereIn('promotion_status', ['layak_naik', 'tuntas_remidi'])->count(),
                'needs_remedial'  => collect($rows)->where('promotion_status', 'remidi_khusus')->count(),
                'tuntas_remidi'   => collect($rows)->where('promotion_status', 'tuntas_remidi')->count(),
                'class_average'   => ($avg = collect($rows)->whereNotNull('average')->avg('average')) !== null ? round((float) $avg, 1) : null,
            ],
            'students'             => $rows,
        ];
    }

    /**
     * Sinkronisasi otomatis tabel report_cards dari hasil evaluasi triwulan.
     */
    public static function syncReportCardsFromEvaluation(array $eval, ?AcademicQuarter $quarter, ?string $rawSemester = null): void
    {
        $classGroup = $eval['class_group_info'];
        $yearId     = $eval['academic_year_id'];
        $quarterId  = $eval['academic_quarter_id'];
        $semKey     = self::resolveSemesterKey($quarter, $rawSemester);

        foreach ($eval['students'] as $st) {
            $gradesSummary = array_values($st['grades']);

            ReportCard::updateOrCreate(
                [
                    'academic_year_id' => $yearId,
                    'class_group_id'   => $classGroup->id,
                    'student_id'       => $st['student_id'],
                    'semester'         => $semKey,
                ],
                [
                    'academic_quarter_id' => $quarterId,
                    'average_score'       => $st['average'],
                    'previous_average'    => $st['previous_average'],
                    'rank'                => $st['rank'],
                    'promotion_status'    => $st['promotion_status'],
                    'grades_summary'      => $gradesSummary,
                    'attendance_summary'  => $st['attendance'],
                    'is_published'        => true,
                ]
            );
        }
    }

    /**
     * GET /api/main/assessments/grading-period
     * Mendapatkan status & rentang tanggal masa penginputan nilai triwulan.
     */
    public function gradingPeriod(Request $request)
    {
        try {
            $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
            $targetQuarterId = $request->query('academic_quarter_id') ?: $request->header('X-Academic-Quarter-Id');

            $activeYear = ($targetYearId ? AcademicYear::find($targetYearId) : null)
                ?? AcademicYear::where('active', true)->first()
                ?? AcademicYear::latest('id')->first();

            $quarter = null;
            if (!empty($targetQuarterId)) {
                $quarter = AcademicQuarter::with('academicYear')
                    ->when($targetYearId, fn($q) => $q->where('academic_year_id', $targetYearId))
                    ->find($targetQuarterId);
                if (!$quarter && !$targetYearId) {
                    $quarter = AcademicQuarter::with('academicYear')->find($targetQuarterId);
                }
            }

            if (!$quarter && $activeYear) {
                $quarter = AcademicQuarter::with('academicYear')
                    ->where('academic_year_id', $activeYear->id)
                    ->where('active', true)
                    ->first()
                    ?? AcademicQuarter::with('academicYear')
                        ->where('academic_year_id', $activeYear->id)
                        ->orderBy('id', 'desc')
                        ->first();
            }

            if (!$quarter) {
                $quarter = AcademicQuarter::with('academicYear')->where('active', true)->first()
                    ?? AcademicQuarter::with('academicYear')->latest('id')->first();
            }

            if ($quarter && $quarter->academicYear) {
                $activeYear = $quarter->academicYear;
            }

            if (!$quarter) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Data periode triwulan tidak ditemukan',
                ], 404);
            }

            $today = Carbon::today();

            // Default jika belum diatur
            $startDate = $quarter->grading_start_date
                ? Carbon::parse($quarter->grading_start_date)->startOfDay()
                : ($quarter->start_date ? Carbon::parse($quarter->start_date)->startOfDay() : $today->copy()->subDays(7));

            $endDate = $quarter->grading_end_date
                ? Carbon::parse($quarter->grading_end_date)->endOfDay()
                : ($quarter->end_date ? Carbon::parse($quarter->end_date)->endOfDay() : $today->copy()->addDays(21));

            $isOpen = $today->betweenIncluded($startDate, $endDate);
            $isExpired = $today->gt($endDate);
            $isUpcoming = $today->lt($startDate);

            $status = $isOpen ? 'open' : ($isExpired ? 'closed' : 'upcoming');
            $statusLabel = match ($status) {
                'open'     => 'Masa Penginputan Nilai Terbuka',
                'closed'   => 'Masa Penginputan Nilai Telah Ditutup',
                'upcoming' => 'Masa Penginputan Nilai Belum Dibuka',
            };

            // Semua triwulan untuk opsi arsip ketika masa aktif telah selesai
            $allQuarters = AcademicQuarter::where('academic_year_id', $quarter->academic_year_id)
                ->orderBy('id')
                ->get();

            return response()->json([
                'status' => 'success',
                'data'   => [
                    'active_academic_year' => $activeYear,
                    'active_quarter'       => $quarter,
                    'grading_start_date'   => $startDate->format('Y-m-d'),
                    'grading_end_date'     => $endDate->format('Y-m-d'),
                    'is_open'              => $isOpen,
                    'status'               => $status,
                    'status_label'         => $statusLabel,
                    'today'                => $today->format('Y-m-d'),
                    'days_remaining'       => $isOpen ? (int) $today->diffInDays($endDate, false) : 0,
                    'quarters_archive'     => $allQuarters,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error getting grading period: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data masa penginputan nilai: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/main/assessments/grading-period
     * Mengatur tanggal awal dan tanggal akhir masa penginputan nilai.
     */
    public function updateGradingPeriod(Request $request)
    {
        $validated = $request->validate([
            'academic_quarter_id' => 'required|exists:academic_quarters,id',
            'grading_start_date'  => 'required|date',
            'grading_end_date'    => 'required|date|after_or_equal:grading_start_date',
        ]);

        try {
            $quarter = AcademicQuarter::findOrFail($validated['academic_quarter_id']);
            $quarter->update([
                'grading_start_date' => $validated['grading_start_date'],
                'grading_end_date'   => $validated['grading_end_date'],
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Pengaturan masa penginputan nilai berhasil diperbarui',
                'data'    => $quarter,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating grading period: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui masa penginputan nilai: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/main/assessments/quarterly-sheet
     * Mengambil lembar penilaian akhir triwulan (Reguler, Khusus, & Muatan Lokal) + Progres & Remidi.
     */
    public function quarterlySheet(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
        ]);

        try {
            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::find($validated['academic_quarter_id'])
                : (AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first());

            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);

            return response()->json([
                'status'  => 'success',
                'message' => 'Lembar nilai akhir triwulan berhasil dimuat',
                'data'    => $eval,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error loading quarterly sheet: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat lembar nilai triwulan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/main/assessments/quarterly-sheet
     * Simpan Nilai Akhir Triwulan (Mapel Khusus, Mapel Reguler, dan Mapel Muatan Lokal Non-Kelas).
     */
    public function saveQuarterlySheet(Request $request)
    {
        $items = $request->input('scores') ?? $request->input('entries') ?? [];

        if (empty($items) || !is_array($items)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Daftar nilai tidak boleh kosong.',
            ], 422);
        }

        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::find($validated['academic_quarter_id'])
                : (AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first());

            $quarterId = $quarter?->id;

            // Cek apakah masa penginputan nilai sedang terbuka
            $today = Carbon::today();
            $startDate = $quarter?->grading_start_date
                ? Carbon::parse($quarter->grading_start_date)->startOfDay()
                : ($quarter?->start_date ? Carbon::parse($quarter->start_date)->startOfDay() : $today->copy()->subDays(7));
            $endDate = $quarter?->grading_end_date
                ? Carbon::parse($quarter->grading_end_date)->endOfDay()
                : ($quarter?->end_date ? Carbon::parse($quarter->end_date)->endOfDay() : $today->copy()->addDays(21));

            if (!$today->betweenIncluded($startDate, $endDate)) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Masa penginputan nilai saat ini sedang ditutup. Silakan buka kembali periode masa penginputan nilai di menu Pengaturan.',
                ], 422);
            }

            $lockAfterSave = (bool) $request->input('lock_after_save', false);
            $skippedLockedCount = 0;
            $savedCount = 0;

            foreach ($items as $item) {
                if (!isset($item['student_id']) || !isset($item['study_id']) || !isset($item['score'])) {
                    continue;
                }

                $inputScore = (float) $item['score'];
                if ($inputScore < 0 || $inputScore > 100) {
                    continue;
                }

                $existing = StudentQuarterlyScore::where([
                    'academic_quarter_id' => $quarterId,
                    'class_group_id'      => $classGroup->id,
                    'student_id'          => $item['student_id'],
                    'study_id'            => $item['study_id'],
                ])->first();

                // Jika nilai sudah dikunci, lewati pengeditan nilai (kecuali hanya mengunci nilai yang belum terkunci)
                if ($existing && $existing->is_locked) {
                    $skippedLockedCount++;
                    continue;
                }

                if ($existing && $existing->is_remedial && $existing->remedial_score !== null) {
                    $origScore  = $inputScore;
                    $remScore   = (float) $existing->remedial_score;
                    $finalScore = max($origScore, $remScore);
                } else {
                    $origScore  = $inputScore;
                    $remScore   = null;
                    $finalScore = $inputScore;
                }

                StudentQuarterlyScore::updateOrCreate(
                    [
                        'academic_quarter_id' => $quarterId,
                        'class_group_id'      => $classGroup->id,
                        'student_id'          => $item['student_id'],
                        'study_id'            => $item['study_id'],
                    ],
                    [
                        'academic_year_id' => $yearId,
                        'original_score'   => $origScore,
                        'remedial_score'   => $remScore,
                        'final_score'      => $finalScore,
                        'is_remedial'      => $existing ? $existing->is_remedial : false,
                        'is_locked'        => $lockAfterSave ? true : ($existing ? (bool) $existing->is_locked : false),
                        'locked_at'        => $lockAfterSave ? now() : $existing?->locked_at,
                        'notes'            => $item['notes'] ?? $existing?->notes,
                    ]
                );
                $savedCount++;
            }

            // Sinkronkan juga ke buku rapor triwulan otomatis
            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
            self::syncReportCardsFromEvaluation($eval, $quarter);

            DB::commit();

            $msg = $lockAfterSave
                ? 'Nilai akhir triwulan berhasil disimpan dan dikunci.'
                : 'Nilai akhir triwulan berhasil disimpan dan buku rapor telah diperbarui.';

            return response()->json([
                'status'  => 'success',
                'message' => $msg,
                'data'    => $eval,
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving quarterly sheet: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan nilai akhir triwulan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/main/assessments/toggle-lock
     * Kunci atau Buka Kunci nilai yang telah diinput pada rombel / mata pelajaran tertentu.
     * Buka kunci (unlock) hanya diizinkan apabila periode masa penginputan nilai sedang terbuka.
     */
    public function toggleScoreLock(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'study_id'            => 'nullable|exists:studies,id',
            'student_id'          => 'nullable|exists:students,id',
            'action'              => 'required|in:lock,unlock',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::find($validated['academic_quarter_id'])
                : (AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first());

            $quarterId = $quarter?->id;

            // Cek status masa penginputan nilai
            $today = Carbon::today();
            $startDate = $quarter?->grading_start_date
                ? Carbon::parse($quarter->grading_start_date)->startOfDay()
                : ($quarter?->start_date ? Carbon::parse($quarter->start_date)->startOfDay() : $today->copy()->subDays(7));
            $endDate = $quarter?->grading_end_date
                ? Carbon::parse($quarter->grading_end_date)->endOfDay()
                : ($quarter?->end_date ? Carbon::parse($quarter->end_date)->endOfDay() : $today->copy()->addDays(21));

            $isOpen = $today->betweenIncluded($startDate, $endDate);

            if ($validated['action'] === 'unlock' && !$isOpen) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Masa penginputan nilai saat ini sedang ditutup. Buka kembali periode masa penginputan nilai di menu Pengaturan agar kunci nilai dapat dibuka.',
                ], 422);
            }

            $query = StudentQuarterlyScore::where('class_group_id', $classGroup->id)
                ->when($quarterId, fn($q) => $q->where('academic_quarter_id', $quarterId))
                ->when(!empty($validated['study_id']), fn($q) => $q->where('study_id', $validated['study_id']))
                ->when(!empty($validated['student_id']), fn($q) => $q->where('student_id', $validated['student_id']));

            $targetCount = (clone $query)->count();
            if ($targetCount === 0) {
                DB::rollBack();
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Belum ada nilai yang tersimpan untuk dikunci / dibuka kuncinya. Simpan nilai terlebih dahulu.',
                ], 422);
            }

            $isLocking = $validated['action'] === 'lock';
            $query->update([
                'is_locked' => $isLocking,
                'locked_at' => $isLocking ? now() : null,
            ]);

            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => $isLocking
                    ? 'Nilai berhasil dikunci dan tidak dapat diedit.'
                    : 'Kunci nilai berhasil dibuka. Nilai kini dapat diedit kembali.',
                'data'    => $eval,
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error toggling score lock: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengubah status kunci nilai: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/main/assessments/remedial-scores
     * Simpan Nilai Remidi khusus untuk Mata Pelajaran Khusus (study_type = 'khusus')
     * pada akhir triwulan ketika nilai / rata-rata santri belum memenuhi standar kenaikan kelas.
     */
    public function saveRemedialScores(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'              => 'required|exists:class_groups,id',
            'academic_year_id'            => 'nullable|exists:academic_years,id',
            'academic_quarter_id'         => 'nullable|exists:academic_quarters,id',
            'remedials'                   => 'required|array|min:1',
            'remedials.*.student_id'      => 'required|exists:students,id',
            'remedials.*.study_id'        => 'required|exists:studies,id',
            'remedials.*.remedial_score'  => 'required|numeric|min:0|max:100',
            'remedials.*.notes'           => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::find($validated['academic_quarter_id'])
                : (AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first());

            $quarterId = $quarter?->id;

            foreach ($validated['remedials'] as $item) {
                $study = Study::findOrFail($item['study_id']);

                if ($study->study_type !== 'khusus') {
                    return response()->json([
                        'status'  => 'error',
                        'message' => "Remidi hanya berlaku untuk Mata Pelajaran Khusus. '{$study->name}' bukan Mata Pelajaran Khusus.",
                    ], 422);
                }

                $existing = StudentQuarterlyScore::where([
                    'academic_quarter_id' => $quarterId,
                    'class_group_id'      => $classGroup->id,
                    'student_id'          => $item['student_id'],
                    'study_id'            => $item['study_id'],
                ])->first();

                $origScore = $existing && $existing->original_score !== null
                    ? (float) $existing->original_score
                    : ($existing ? (float) $existing->final_score : 0.0);

                $remScore   = (float) $item['remedial_score'];
                $finalScore = max($origScore, $remScore);

                StudentQuarterlyScore::updateOrCreate(
                    [
                        'academic_quarter_id' => $quarterId,
                        'class_group_id'      => $classGroup->id,
                        'student_id'          => $item['student_id'],
                        'study_id'            => $item['study_id'],
                    ],
                    [
                        'academic_year_id' => $yearId,
                        'original_score'   => $origScore,
                        'remedial_score'   => $remScore,
                        'final_score'      => $finalScore,
                        'is_remedial'      => true,
                        'notes'            => $item['notes'] ?? "Remidi Mapel Khusus (Nilai Awal: {$origScore} -> Remidi: {$remScore})",
                    ]
                );
            }

            // Sinkronkan kembali evaluasi & buku rapor
            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
            self::syncReportCardsFromEvaluation($eval, $quarter);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Nilai remidi Mata Pelajaran Khusus berhasil disimpan dan evaluasi kenaikan kelas telah diperbarui.',
                'data'    => $eval,
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving remedial scores: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan nilai remidi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Leger Nilai Kelas (Menggunakan hasil evaluasi akhir triwulan).
     */
    public function classGradebook(Request $request)
    {
        return $this->quarterlySheet($request);
    }

    public function categories()
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Kategori penilaian berhasil diambil',
            'data'    => AssessmentCategory::where('is_active', true)->where('code', '!=', 'tahfidz')->get(),
        ], 200);
    }

    public function index(Request $request)
    {
        return $this->quarterlySheet($request);
    }

    public function store(Request $request)
    {
        return $this->saveQuarterlySheet($request);
    }

    public function show(string $id)
    {
        $assessment = Assessment::with(['classGroup', 'study', 'teacher', 'scores.student'])->find($id);
        if (!$assessment) {
            return response()->json(['status' => 'error', 'message' => 'Data tidak ditemukan'], 404);
        }
        return response()->json(['status' => 'success', 'data' => $assessment], 200);
    }

    public function update(Request $request, string $id)
    {
        $assessment = Assessment::findOrFail($id);
        $assessment->update($request->only(['title', 'description', 'date', 'max_score']));
        return response()->json(['status' => 'success', 'data' => $assessment], 200);
    }

    public function destroy(string $id)
    {
        $assessment = Assessment::findOrFail($id);
        $assessment->delete();
        return response()->json(['status' => 'success', 'message' => 'Data berhasil dihapus'], 200);
    }

    public function saveScores(Request $request, string $id)
    {
        return response()->json(['status' => 'success', 'message' => 'Gunakan endpoint quarterly-sheet'], 200);
    }

    /**
     * GET /api/main/assessments/exam-eligibility?nis={nis}
     */
    public function examEligibility(Request $request, BankSantriService $bankSantri)
    {
        $validated = $request->validate([
            'nis' => 'required|string|exists:students,nis',
        ]);

        $student = Student::where('nis', $validated['nis'])->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data'   => $bankSantri->checkExamEligibility($student),
        ]);
    }

    /**
     * GET /api/main/assessments/class-exam-eligibility/{class_group_id}
     */
    public function classExamEligibility(string $classGroupId, BankSantriService $bankSantri)
    {
        $studentIds = StudentClass::where('class_group_id', $classGroupId)
            ->where('status', 'aktif')
            ->pluck('student_id');

        $students = Student::whereIn('id', $studentIds)->orderBy('name', 'asc')->get();

        $results = $students->map(function (Student $student) use ($bankSantri) {
            return [
                'student_id'  => $student->id,
                'nis'         => $student->nis,
                'name'        => $student->name,
                'is_mukim'    => (bool) $student->is_mukim,
                'eligibility' => $bankSantri->checkExamEligibility($student),
            ];
        });

        return response()->json([
            'status'       => 'success',
            'total'        => $results->count(),
            'eligible'     => $results->where('eligibility.eligible', true)->count(),
            'not_eligible' => $results->where('eligibility.eligible', false)->count(),
            'data'         => $results->values(),
        ]);
    }

    /**
     * GET /api/main/assessments/collective-template
     * Unduh Template Excel (.xlsx) Penilaian Kolektif Multi-Mata Pelajaran untuk 1 Rombel.
     */
    public function downloadCollectiveTemplate(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'study_ids'           => 'nullable',
            'include_existing'    => 'nullable',
        ]);

        try {
            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::with('academicYear')->find($validated['academic_quarter_id'])
                : (AcademicQuarter::with('academicYear')->where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::with('academicYear')->where('academic_year_id', $yearId)->latest('id')->first());

            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
            $allStudies = collect($eval['studies'] ?? []);
            $students = $eval['students'] ?? [];

            // Filter mata pelajaran jika user memilih study_ids tertentu
            $rawStudyIds = $request->input('study_ids');
            if (!empty($rawStudyIds)) {
                $studyIdList = is_array($rawStudyIds)
                    ? array_map('intval', $rawStudyIds)
                    : array_map('intval', array_filter(explode(',', (string) $rawStudyIds)));
                if (!empty($studyIdList)) {
                    $allStudies = $allStudies->filter(fn($s) => in_array((int) $s->id, $studyIdList, true))->values();
                }
            }

            $includeExisting = filter_var($request->input('include_existing', true), FILTER_VALIDATE_BOOLEAN);

            $spreadsheet = new Spreadsheet();
            $spreadsheet->getProperties()
                ->setCreator('e-Panyeppen — SIM Akademik')
                ->setTitle("Template Nilai Kolektif {$classGroup->name}")
                ->setSubject('Penilaian Akhir Triwulan Kolektif');

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Nilai Kolektif Rombel');

            $studyCount = $allStudies->count();
            $lastColIndex = 4 + max(1, $studyCount);
            $lastColLetter = Coordinate::stringFromColumnIndex($lastColIndex);

            $yearName = $quarter?->academicYear?->year ?? $classGroup->academicYear?->year ?? '-';
            $quarterName = $quarter?->name ?? 'Triwulan Aktif';
            $programName = $classGroup->program?->name ?? 'Program';
            $eduName = $classGroup->education?->name ?? 'Jenjang';
            $homeroomName = $classGroup->homeroomTeacher?->name ?? '-';

            // Baris 1: Judul Utama
            $sheet->mergeCells("A1:{$lastColLetter}1");
            $sheet->setCellValue('A1', 'LEMBAR PENILAIAN KOLEKTIF AKHIR TRIWULAN — SIM AKADEMIK PESANTREN');
            $sheet->getStyle('A1')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0B57D0']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(1)->setRowHeight(26);

            // Baris 2: Metadata Rombel
            $sheet->mergeCells("A2:{$lastColLetter}2");
            $sheet->setCellValue(
                'A2',
                "Kelas / Rombel: {$classGroup->name} ({$programName} • {$eduName})   |   Wali Kelas: {$homeroomName}   |   Tahun Ajaran: {$yearName} H   |   Periode: {$quarterName}"
            );
            $sheet->getStyle('A2')->applyFromArray([
                'font'      => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '1E293B']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F1F5F9']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(2)->setRowHeight(20);

            // Baris 3: Petunjuk Pengisian
            $sheet->mergeCells("A3:{$lastColLetter}3");
            $sheet->setCellValue(
                'A3',
                'PETUNJUK: Isi nilai angka (0 - 100) pada kolom mata pelajaran yang diampu. Biarkan kosong pada mata pelajaran yang tidak ingin diubah. Jangan mengubah Baris 5 (Kode Sistem) & Kolom NIS.'
            );
            $sheet->getStyle('A3')->applyFromArray([
                'font'      => ['italic' => true, 'size' => 9, 'color' => ['rgb' => '475569']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FFFBEB']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(3)->setRowHeight(18);

            // Baris 5: Header Kode Sistem (Machine-Readable Identifier)
            $sheet->setCellValue('A5', 'NO');
            $sheet->setCellValue('B5', 'NIS');
            $sheet->setCellValue('C5', 'NAMA_SANTRI');
            $sheet->setCellValue('D5', 'DOMISILI');

            // Baris 6: Header Visual Nama Mata Pelajaran & KKM
            $sheet->setCellValue('A6', 'No.');
            $sheet->setCellValue('B6', 'NIS Santri');
            $sheet->setCellValue('C6', 'Nama Lengkap Santri');
            $sheet->setCellValue('D6', 'Status');

            foreach ($allStudies as $idx => $study) {
                $colLetter = Coordinate::stringFromColumnIndex(5 + $idx);
                $typeLabel = match ($study->study_type) {
                    'khusus'       => 'Khusus',
                    'muatan_lokal' => 'Mulok',
                    default        => 'Reguler',
                };
                $kkmVal = $study->kkm ?: 65;

                // Baris 5: Tag ID & Kode Mapel agar saat diimport tetap akurat meskipun kolom digeser/dihapus
                $sheet->setCellValue("{$colLetter}5", "[STUDY_{$study->id}] {$study->code}");

                // Baris 6: Nama Mapel + Jenis + KKM
                $sheet->setCellValue("{$colLetter}6", "{$study->name}\n({$typeLabel} • KKM {$kkmVal})");
                $sheet->getColumnDimension($colLetter)->setWidth(20);
            }

            $sheet->getStyle("A5:{$lastColLetter}5")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 8, 'color' => ['rgb' => 'E2E8F0']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E293B']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(5)->setRowHeight(16);

            $sheet->getStyle("A6:{$lastColLetter}6")->applyFromArray([
                'font'      => ['bold' => true, 'size' => 10, 'color' => ['rgb' => 'FFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical'   => Alignment::VERTICAL_CENTER,
                    'wrapText'   => true,
                ],
                'borders'   => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '334155']],
                ],
            ]);
            $sheet->getRowDimension(6)->setRowHeight(32);

            // Lebar kolom identitas
            $sheet->getColumnDimension('A')->setWidth(6);
            $sheet->getColumnDimension('B')->setWidth(18);
            $sheet->getColumnDimension('C')->setWidth(32);
            $sheet->getColumnDimension('D')->setWidth(12);

            // Isi Baris Data Santri mulai baris 7
            $startRow = 7;
            foreach ($students as $rIdx => $st) {
                $rowNum = $startRow + $rIdx;
                $sheet->setCellValue("A{$rowNum}", $rIdx + 1);
                $sheet->setCellValueExplicit("B{$rowNum}", (string) ($st['nis'] ?? $st['student_nis'] ?? ''), DataType::TYPE_STRING);
                $sheet->setCellValue("C{$rowNum}", (string) ($st['name'] ?? $st['student_name'] ?? ''));
                $sheet->setCellValue("D{$rowNum}", !empty($st['is_mukim']) ? 'Mukim' : 'Luar');

                foreach ($allStudies as $sIdx => $study) {
                    $colLetter = Coordinate::stringFromColumnIndex(5 + $sIdx);
                    $cellCoord = "{$colLetter}{$rowNum}";

                    $gradeMeta = $st['grades'][$study->id] ?? null;
                    $existingScore = $gradeMeta['score'] ?? null;

                    if ($includeExisting && $existingScore !== null && $existingScore !== '') {
                        $sheet->setCellValueExplicit($cellCoord, (float) $existingScore, DataType::TYPE_NUMERIC);
                    }

                    // Validasi angka 0 - 100 di Excel
                    $validation = $sheet->getCell($cellCoord)->getDataValidation();
                    $validation->setType(DataValidation::TYPE_DECIMAL);
                    $validation->setErrorStyle(DataValidation::STYLE_STOP);
                    $validation->setAllowBlank(true);
                    $validation->setShowInputMessage(true);
                    $validation->setShowErrorMessage(true);
                    $validation->setErrorTitle('Nilai Tidak Valid');
                    $validation->setError('Masukkan nilai angka antara 0 sampai 100.');
                    $validation->setPromptTitle($study->name);
                    $validation->setPrompt("Masukkan nilai akhir triwulan (0 - 100). KKM: " . ($study->kkm ?: 65));
                    $validation->setFormula1('0');
                    $validation->setFormula2('100');
                }

                $sheet->getRowDimension($rowNum)->setRowHeight(20);
            }

            $endRow = max($startRow, $startRow + count($students) - 1);
            if (count($students) > 0) {
                $sheet->getStyle("A{$startRow}:{$lastColLetter}{$endRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    ],
                    'alignment' => [
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);
                $sheet->getStyle("A{$startRow}:B{$endRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$startRow}:{$lastColLetter}{$endRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("A{$startRow}:D{$endRow}")->applyFromArray([
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                ]);
            }

            // Freeze Panes agar kolom No, NIS, Nama, Status dan Header tetap terlihat saat digeser
            $sheet->freezePane('E7');

            $safeGroupName = preg_replace('/[^A-Za-z0-9_-]/', '_', $classGroup->name);
            $safeQuarter = preg_replace('/[^A-Za-z0-9_-]/', '_', $quarterName);
            $filename = "Template_Nilai_Kolektif_{$safeGroupName}_{$safeQuarter}.xlsx";

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control'       => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating collective Excel template: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat template Excel penilaian kolektif: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/main/assessments/collective-import
     * Unggah & Validasi (Preview) atau Simpan Langsung (Commit) file Excel Penilaian Kolektif Multi-Mapel dalam 1 Rombel.
     */
    public function importCollectiveExcel(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'file'                => 'required|file|max:10240',
            'mode'                => 'nullable|in:preview,commit',
            'lock_after_save'     => 'nullable',
        ]);

        try {
            $mode = $validated['mode'] ?? 'preview';
            $lockAfterSave = filter_var($request->input('lock_after_save', false), FILTER_VALIDATE_BOOLEAN);

            $classGroup = ClassGroup::with(['educationalInstitution', 'education', 'program', 'homeroomTeacher', 'academicYear'])
                ->findOrFail($validated['class_group_id']);

            $yearId = (int) ($validated['academic_year_id']
                ?? $classGroup->academic_year_id
                ?? AcademicYear::where('active', true)->value('id')
                ?? AcademicYear::latest('id')->value('id'));

            $quarter = !empty($validated['academic_quarter_id'])
                ? AcademicQuarter::find($validated['academic_quarter_id'])
                : (AcademicQuarter::where('academic_year_id', $yearId)->where('active', true)->first()
                    ?? AcademicQuarter::where('academic_year_id', $yearId)->latest('id')->first());

            $quarterId = $quarter?->id;

            // Cek status masa penginputan nilai jika hendak commit
            $today = Carbon::today();
            $startDate = $quarter?->grading_start_date
                ? Carbon::parse($quarter->grading_start_date)->startOfDay()
                : ($quarter?->start_date ? Carbon::parse($quarter->start_date)->startOfDay() : $today->copy()->subDays(7));
            $endDate = $quarter?->grading_end_date
                ? Carbon::parse($quarter->grading_end_date)->endOfDay()
                : ($quarter?->end_date ? Carbon::parse($quarter->end_date)->endOfDay() : $today->copy()->addDays(21));
            $isOpenGrading = $today->betweenIncluded($startDate, $endDate);

            if ($mode === 'commit' && !$isOpenGrading) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Masa penginputan nilai saat ini sedang ditutup. Silakan buka kembali periode masa penginputan nilai di menu Pengaturan.',
                ], 422);
            }

            $eval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
            $allStudies = collect($eval['studies'] ?? []);
            $studentsInClass = collect($eval['students'] ?? []);

            // Buat peta pencarian mata pelajaran berdasarkan ID, Kode, dan Nama
            $studyById = $allStudies->keyBy(fn($s) => (int) $s->id);
            $studyByCode = $allStudies->keyBy(fn($s) => mb_strtolower(trim((string) $s->code)));
            $studyByName = $allStudies->keyBy(fn($s) => mb_strtolower(trim((string) $s->name)));

            // Buat peta pencarian santri di rombel ini berdasarkan NIS dan Nama
            $studentByNis = [];
            $studentByName = [];
            foreach ($studentsInClass as $st) {
                $nisKey = preg_replace('/\s+/', '', mb_strtolower((string) ($st['nis'] ?? $st['student_nis'] ?? '')));
                if ($nisKey !== '') {
                    $studentByNis[$nisKey] = $st;
                }
                $nameKey = mb_strtolower(trim((string) ($st['name'] ?? $st['student_name'] ?? '')));
                if ($nameKey !== '') {
                    $studentByName[$nameKey] = $st;
                }
            }

            // Baca file spreadsheet yang diunggah
            $uploadedFile = $request->file('file');
            $spreadsheet = IOFactory::load($uploadedFile->getRealPath());
            $worksheet = $spreadsheet->getSheet(0);
            $rows = $worksheet->toArray(null, true, false, false);

            if (empty($rows) || count($rows) < 2) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'File Excel kosong atau tidak memiliki baris data.',
                ], 422);
            }

            // Deteksi baris header & pemetaan kolom (NIS, Nama, dan Mata Pelajaran)
            $nisColIdx = null;
            $nameColIdx = null;
            $studyColumns = []; // [colIdx => Study]
            $lastHeaderRowIdx = 0;

            $maxScanRows = min(15, count($rows));
            for ($r = 0; $r < $maxScanRows; $r++) {
                $rowCells = $rows[$r] ?? [];
                foreach ($rowCells as $cIdx => $cellVal) {
                    $rawText = trim((string) $cellVal);
                    if ($rawText === '') {
                        continue;
                    }
                    $upperText = mb_strtoupper($rawText);
                    $lowerText = mb_strtolower($rawText);

                    // Cek kolom NIS
                    if ($nisColIdx === null && in_array($upperText, ['NIS', 'NIS SANTRI', 'NIS_SANTRI', 'NOMOR INDUK', 'NO INDUK'], true)) {
                        $nisColIdx = $cIdx;
                        $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                        continue;
                    }

                    // Cek kolom Nama Santri
                    if ($nameColIdx === null && in_array($upperText, ['NAMA_SANTRI', 'NAMA SANTRI', 'NAMA LENGKAP SANTRI', 'NAMA LENGKAP', 'NAMA', 'SANTRI'], true)) {
                        $nameColIdx = $cIdx;
                        $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                        continue;
                    }

                    // Cek apakah sel memiliki tag [STUDY_{id}] dari template resmi
                    if (preg_match('/\[STUDY_(\d+)\]/i', $rawText, $m)) {
                        $stId = (int) $m[1];
                        if ($studyById->has($stId)) {
                            $studyColumns[$cIdx] = $studyById->get($stId);
                            $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                            continue;
                        }
                    }

                    // Jika kolom ini sudah terpetakan dari tag [STUDY_id], tetap perbarui lastHeaderRowIdx bila baris di bawahnya adalah sub-header nama mapel
                    if (isset($studyColumns[$cIdx])) {
                        $mappedStudy = $studyColumns[$cIdx];
                        $cleanFirstLine = mb_strtolower(trim(explode("\n", $rawText)[0]));
                        if ($cleanFirstLine === mb_strtolower(trim($mappedStudy->name))) {
                            $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                        }
                        continue;
                    }

                    // Pencocokan berdasarkan Kode Mapel atau Nama Mapel (untuk file Excel rekap buatan guru sendiri)
                    $cleanHeaderLine = mb_strtolower(trim(explode("\n", $rawText)[0]));
                    // Bersihkan juga jika ada akhiran "(KKM ...)" di baris yang sama
                    $cleanHeaderNoParen = trim((string) preg_replace('/\s*\(.*?\)\s*$/', '', $cleanHeaderLine));

                    if ($studyByCode->has($lowerText)) {
                        $studyColumns[$cIdx] = $studyByCode->get($lowerText);
                        $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                    } elseif ($studyByName->has($cleanHeaderLine)) {
                        $studyColumns[$cIdx] = $studyByName->get($cleanHeaderLine);
                        $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                    } elseif ($cleanHeaderNoParen !== '' && $studyByName->has($cleanHeaderNoParen)) {
                        $studyColumns[$cIdx] = $studyByName->get($cleanHeaderNoParen);
                        $lastHeaderRowIdx = max($lastHeaderRowIdx, $r);
                    }
                }
            }

            if ($nisColIdx === null && $nameColIdx === null) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Kolom identitas santri (NIS atau Nama Santri) tidak ditemukan pada file Excel. Gunakan Template Excel resmi dari sistem.',
                ], 422);
            }

            if (empty($studyColumns)) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Tidak ada kolom Mata Pelajaran yang cocok dengan kurikulum rombel ini. Pastikan header kolom mata pelajaran sesuai dengan Template Excel.',
                ], 422);
            }

            // Mulai memproses baris data santri di bawah baris header terakhir
            $dataStartRow = $lastHeaderRowIdx + 1;
            $detectedStudiesSummary = [];
            foreach ($studyColumns as $cIdx => $stObj) {
                $detectedStudiesSummary[$stObj->id] = [
                    'study_id'            => $stObj->id,
                    'study_code'          => $stObj->code,
                    'study_name'          => $stObj->name,
                    'study_type'          => $stObj->study_type ?: 'reguler',
                    'kkm'                 => (float) ($stObj->kkm ?: 65),
                    'filled_count'        => 0,
                    'new_count'           => 0,
                    'updated_count'       => 0,
                    'unchanged_count'     => 0,
                    'locked_skipped_count'=> 0,
                    'below_kkm_count'     => 0,
                    'invalid_count'       => 0,
                ];
            }

            $entriesToSave = [];
            $studentPreviewsMap = [];
            $invalidCells = [];
            $unmatchedRows = [];
            $matchedStudentIds = [];

            // Siapkan struktur preview awal untuk seluruh santri di rombel
            foreach ($studentsInClass as $st) {
                $sId = $st['student_id'];
                $studentPreviewsMap[$sId] = [
                    'student_id'   => $sId,
                    'nis'          => $st['nis'] ?? $st['student_nis'],
                    'name'         => $st['name'] ?? $st['student_name'],
                    'is_mukim'     => (bool) ($st['is_mukim'] ?? true),
                    'matched_row'  => false,
                    'cells'        => [],
                ];

                foreach ($studyColumns as $cIdx => $stObj) {
                    $existingMeta = $st['grades'][$stObj->id] ?? null;
                    $studentPreviewsMap[$sId]['cells'][$stObj->id] = [
                        'study_id'   => $stObj->id,
                        'old_score'  => $existingMeta['score'] ?? null,
                        'new_score'  => null,
                        'is_locked'  => (bool) ($existingMeta['is_locked'] ?? false),
                        'status'     => 'empty', // empty | new | updated | unchanged | locked | invalid
                        'is_pass'    => null,
                        'kkm'        => (float) ($stObj->kkm ?: 65),
                    ];
                }
            }

            $newEntriesCount = 0;
            $updatedEntriesCount = 0;
            $unchangedEntriesCount = 0;
            $lockedSkippedCount = 0;
            $belowKkmCount = 0;

            for ($r = $dataStartRow; $r < count($rows); $r++) {
                $rowCells = $rows[$r] ?? [];
                $excelRowNumber = $r + 1;

                $rawNis = $nisColIdx !== null ? trim((string) ($rowCells[$nisColIdx] ?? '')) : '';
                $rawName = $nameColIdx !== null ? trim((string) ($rowCells[$nameColIdx] ?? '')) : '';

                // Lewati baris yang benar-benar kosong
                if ($rawNis === '' && $rawName === '') {
                    continue;
                }

                // Normalisasi NIS jika terformat desimal/scientific oleh Excel
                $cleanNis = preg_replace('/\s+/', '', mb_strtolower($rawNis));
                if (is_numeric($rawNis) && str_contains(strtoupper($rawNis), 'E')) {
                    $cleanNis = number_format((float) $rawNis, 0, '', '');
                }

                $matchedStudent = null;
                if ($cleanNis !== '' && isset($studentByNis[$cleanNis])) {
                    $matchedStudent = $studentByNis[$cleanNis];
                } elseif ($rawName !== '' && isset($studentByName[mb_strtolower($rawName)])) {
                    $matchedStudent = $studentByName[mb_strtolower($rawName)];
                }

                if (!$matchedStudent) {
                    $unmatchedRows[] = [
                        'row'  => $excelRowNumber,
                        'nis'  => $rawNis ?: '-',
                        'name' => $rawName ?: '-',
                        'reason' => 'NIS / Nama santri tidak terdaftar pada rombel ini.',
                    ];
                    continue;
                }

                $sId = $matchedStudent['student_id'];
                $matchedStudentIds[$sId] = true;
                $studentPreviewsMap[$sId]['matched_row'] = true;

                foreach ($studyColumns as $cIdx => $stObj) {
                    $studyId = $stObj->id;
                    $kkmVal = (float) ($stObj->kkm ?: 65);
                    $rawScoreCell = isset($rowCells[$cIdx]) ? trim((string) $rowCells[$cIdx]) : '';

                    if ($rawScoreCell === '' || $rawScoreCell === '-') {
                        continue;
                    }

                    // Normalisasi koma menjadi titik desimal
                    $normalizedScoreStr = str_replace(',', '.', $rawScoreCell);
                    if (!is_numeric($normalizedScoreStr)) {
                        $detectedStudiesSummary[$studyId]['invalid_count']++;
                        $invalidCells[] = [
                            'row'        => $excelRowNumber,
                            'student'    => $matchedStudent['name'],
                            'study_name' => $stObj->name,
                            'raw_value'  => $rawScoreCell,
                            'reason'     => 'Nilai bukan angka yang valid.',
                        ];
                        $studentPreviewsMap[$sId]['cells'][$studyId]['status'] = 'invalid';
                        $studentPreviewsMap[$sId]['cells'][$studyId]['raw_value'] = $rawScoreCell;
                        continue;
                    }

                    $scoreVal = round((float) $normalizedScoreStr, 1);
                    if ($scoreVal < 0 || $scoreVal > 100) {
                        $detectedStudiesSummary[$studyId]['invalid_count']++;
                        $invalidCells[] = [
                            'row'        => $excelRowNumber,
                            'student'    => $matchedStudent['name'],
                            'study_name' => $stObj->name,
                            'raw_value'  => $rawScoreCell,
                            'reason'     => 'Nilai harus berada di rentang 0 - 100.',
                        ];
                        $studentPreviewsMap[$sId]['cells'][$studyId]['status'] = 'invalid';
                        $studentPreviewsMap[$sId]['cells'][$studyId]['raw_value'] = $rawScoreCell;
                        continue;
                    }

                    $existingMeta = $matchedStudent['grades'][$studyId] ?? null;
                    $oldScore = $existingMeta['score'] ?? null;
                    $isLocked = (bool) ($existingMeta['is_locked'] ?? false);

                    $detectedStudiesSummary[$studyId]['filled_count']++;

                    if ($isLocked) {
                        $lockedSkippedCount++;
                        $detectedStudiesSummary[$studyId]['locked_skipped_count']++;
                        $studentPreviewsMap[$sId]['cells'][$studyId]['new_score'] = $scoreVal;
                        $studentPreviewsMap[$sId]['cells'][$studyId]['status'] = 'locked';
                        continue;
                    }

                    $isPass = $scoreVal >= $kkmVal;
                    if (!$isPass) {
                        $belowKkmCount++;
                        $detectedStudiesSummary[$studyId]['below_kkm_count']++;
                    }

                    if ($oldScore === null) {
                        $cellStatus = 'new';
                        $newEntriesCount++;
                        $detectedStudiesSummary[$studyId]['new_count']++;
                    } elseif (abs((float) $oldScore - $scoreVal) > 0.01) {
                        $cellStatus = 'updated';
                        $updatedEntriesCount++;
                        $detectedStudiesSummary[$studyId]['updated_count']++;
                    } else {
                        $cellStatus = 'unchanged';
                        $unchangedEntriesCount++;
                        $detectedStudiesSummary[$studyId]['unchanged_count']++;
                    }

                    $studentPreviewsMap[$sId]['cells'][$studyId]['new_score'] = $scoreVal;
                    $studentPreviewsMap[$sId]['cells'][$studyId]['status'] = $cellStatus;
                    $studentPreviewsMap[$sId]['cells'][$studyId]['is_pass'] = $isPass;

                    $entriesToSave[] = [
                        'student_id' => (int) $sId,
                        'study_id'   => (int) $studyId,
                        'score'      => $scoreVal,
                    ];
                }
            }

            // Jika mode === 'commit', langsung simpan ke database dan sinkronkan rapor
            if ($mode === 'commit') {
                if (empty($entriesToSave)) {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Tidak ada nilai baru/terbuka yang dapat disimpan dari file Excel ini.',
                    ], 422);
                }

                DB::beginTransaction();
                foreach ($entriesToSave as $item) {
                    $existing = StudentQuarterlyScore::where([
                        'academic_quarter_id' => $quarterId,
                        'class_group_id'      => $classGroup->id,
                        'student_id'          => $item['student_id'],
                        'study_id'            => $item['study_id'],
                    ])->first();

                    if ($existing && $existing->is_locked) {
                        continue;
                    }

                    $inputScore = (float) $item['score'];
                    if ($existing && $existing->is_remedial && $existing->remedial_score !== null) {
                        $origScore  = $inputScore;
                        $remScore   = (float) $existing->remedial_score;
                        $finalScore = max($origScore, $remScore);
                    } else {
                        $origScore  = $inputScore;
                        $remScore   = null;
                        $finalScore = $inputScore;
                    }

                    StudentQuarterlyScore::updateOrCreate(
                        [
                            'academic_quarter_id' => $quarterId,
                            'class_group_id'      => $classGroup->id,
                            'student_id'          => $item['student_id'],
                            'study_id'            => $item['study_id'],
                        ],
                        [
                            'academic_year_id' => $yearId,
                            'original_score'   => $origScore,
                            'remedial_score'   => $remScore,
                            'final_score'      => $finalScore,
                            'is_remedial'      => $existing ? $existing->is_remedial : false,
                            'is_locked'        => $lockAfterSave ? true : ($existing ? (bool) $existing->is_locked : false),
                            'locked_at'        => $lockAfterSave ? now() : $existing?->locked_at,
                        ]
                    );
                }

                $updatedEval = self::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
                self::syncReportCardsFromEvaluation($updatedEval, $quarter);
                DB::commit();

                return response()->json([
                    'status'  => 'success',
                    'message' => 'Import nilai kolektif berhasil disimpan (' . count($entriesToSave) . ' entri nilai) dan buku rapor telah diperbarui.',
                    'data'    => $updatedEval,
                ], 200);
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'File Excel berhasil divalidasi. Silakan tinjau pratinjau nilai sebelum disimpan.',
                'data'    => [
                    'class_group_id'      => $classGroup->id,
                    'class_group_name'    => $classGroup->name,
                    'academic_year_id'    => $yearId,
                    'academic_quarter_id' => $quarterId,
                    'quarter_name'        => $quarter?->name,
                    'detected_studies'    => array_values($detectedStudiesSummary),
                    'summary'             => [
                        'total_students_in_class' => $studentsInClass->count(),
                        'matched_students_count'  => count($matchedStudentIds),
                        'detected_studies_count'  => count($detectedStudiesSummary),
                        'valid_entries_count'     => count($entriesToSave),
                        'new_entries_count'       => $newEntriesCount,
                        'updated_entries_count'   => $updatedEntriesCount,
                        'unchanged_entries_count' => $unchangedEntriesCount,
                        'locked_skipped_count'    => $lockedSkippedCount,
                        'below_kkm_count'         => $belowKkmCount,
                        'invalid_cells_count'     => count($invalidCells),
                        'unmatched_rows_count'    => count($unmatchedRows),
                    ],
                    'entries'          => $entriesToSave,
                    'student_previews' => array_values($studentPreviewsMap),
                    'invalid_cells'    => $invalidCells,
                    'unmatched_rows'   => $unmatchedRows,
                ],
            ], 200);
        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            Log::error('Error importing collective Excel: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses file Excel: ' . $e->getMessage(),
            ], 500);
        }
    }
}
