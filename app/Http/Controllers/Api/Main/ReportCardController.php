<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\ReportCard;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\Student;
use App\Models\Study;
use App\Models\AssessmentScore;
use App\Models\TeachingJournal;
use App\Models\StudentPresence;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Barryvdh\DomPDF\Facade\Pdf;

class ReportCardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = ReportCard::with(['student', 'classGroup.educationalInstitution', 'classGroup.homeroomTeacher']);

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->has('semester')) {
                $query->where('semester', $request->query('semester'));
            }

            $reports = $query->orderBy('rank', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data buku rapor berhasil diambil',
                'data'    => $reports,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving report cards: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data rapor',
            ], 500);
        }
    }

    /**
     * Generate / Kalkulasi Massal Rapor Digital Kelas.
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'semester'       => 'required|in:ganjil,genap',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::with(['educationalInstitution', 'homeroomTeacher'])
                ->findOrFail($validated['class_group_id']);

            $activeStudents = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get();

            $studies = Study::where(function ($q) use ($classGroup) {
                $q->where('educational_institution_id', $classGroup->educational_institution_id)
                  ->orWhereNull('educational_institution_id');
            })->where('is_active', true)->get();

            $journalIds = TeachingJournal::where('class_group_id', $classGroup->id)->pluck('id');

            $tempReports = [];

            foreach ($activeStudents as $sc) {
                $sId = $sc->student_id;

                // 1. Rekap Nilai Akademik
                $gradesSummary = [];
                $totalSum = 0;
                $count = 0;

                foreach ($studies as $study) {
                    $avg = AssessmentScore::whereHas('assessment', function ($q) use ($classGroup, $study) {
                        $q->where('class_group_id', $classGroup->id)
                          ->where('study_id', $study->id);
                    })->where('student_id', $sId)->avg('score');

                    $scoreVal = $avg !== null ? round($avg, 1) : 0;
                    $gradesSummary[] = [
                        'study_name' => $study->name,
                        'kkm'        => (float)$study->kkm,
                        'score'      => $scoreVal,
                        'predicate'  => $scoreVal >= 90 ? 'A' : ($scoreVal >= 80 ? 'B' : ($scoreVal >= 70 ? 'C' : 'D')),
                    ];

                    $totalSum += $scoreVal;
                    $count++;
                }

                $avgScore = $count > 0 ? round($totalSum / $count, 1) : 0;

                // 2. Rekap Absensi
                $hadir = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'hadir')->count();
                $sakit = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'sakit')->count();
                $izin  = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'izin')->count();
                $alpa  = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'alpa')->count();

                $attendanceSummary = [
                    'hadir' => $hadir,
                    'sakit' => $sakit,
                    'izin'  => $izin,
                    'alpa'  => $alpa,
                ];

                $tempReports[] = [
                    'student_id'         => $sId,
                    'average_score'      => $avgScore,
                    'grades_summary'     => $gradesSummary,
                    'attendance_summary' => $attendanceSummary,
                ];
            }

            // Hitung Ranking
            usort($tempReports, fn($a, $b) => $b['average_score'] <=> $a['average_score']);

            foreach ($tempReports as $rankIndex => $data) {
                ReportCard::updateOrCreate(
                    [
                        'academic_year_id' => $classGroup->academic_year_id,
                        'class_group_id'   => $classGroup->id,
                        'student_id'       => $data['student_id'],
                        'semester'         => $validated['semester'],
                    ],
                    [
                        'average_score'      => $data['average_score'],
                        'rank'               => $rankIndex + 1,
                        'grades_summary'     => $data['grades_summary'],
                        'attendance_summary' => $data['attendance_summary'],
                        'is_published'       => true,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Rapor digital semester {$validated['semester']} berhasil di-generate untuk {$classGroup->name}",
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error generating report cards: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal meng-generate rapor: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $report = ReportCard::with([
            'student',
            'classGroup.educationalInstitution',
            'classGroup.homeroomTeacher',
            'academicYear'
        ])->find($id);

        if (!$report) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rapor tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail rapor berhasil diambil',
            'data'    => $report,
        ], 200);
    }

    public function updateNotes(Request $request, string $id)
    {
        $report = ReportCard::findOrFail($id);

        $validated = $request->validate([
            'homeroom_notes' => 'nullable|string',
            'tahfidz_notes'  => 'nullable|string',
        ]);

        try {
            $report->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Catatan rapor berhasil diperbarui',
                'data'    => $report,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating report notes: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui catatan rapor',
            ], 500);
        }
    }

    /**
     * Cetak Lembar Rapor Siswa ke Format PDF Resmi.
     */
    public function exportPdf(string $id)
    {
        $report = ReportCard::with([
            'student',
            'classGroup.educationalInstitution',
            'classGroup.homeroomTeacher',
            'academicYear'
        ])->findOrFail($id);

        try {
            $pdf = Pdf::loadView('pdf.report_card', [
                'report'     => $report,
                'student'    => $report->student,
                'classGroup' => $report->classGroup,
                'inst'       => $report->classGroup->educationalInstitution,
                'teacher'    => $report->classGroup->homeroomTeacher,
            ]);

            $pdf->setPaper('a4', 'portrait');

            $filename = "Rapor_{$report->student->nis}_{$report->student->name}.pdf";

            return $pdf->stream($filename);
        } catch (\Exception $e) {
            Log::error('Error generating PDF report card: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mencetak PDF rapor: ' . $e->getMessage(),
            ], 500);
        }
    }
}
