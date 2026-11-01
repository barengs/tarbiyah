<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\ReportCard;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReportCardController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = ReportCard::with([
                'student',
                'classGroup.educationalInstitution',
                'classGroup.education',
                'classGroup.program',
                'classGroup.homeroomTeacher',
                'academicYear',
                'academicQuarter',
            ]);

            if ($request->filled('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->filled('academic_year_id')) {
                $query->where('academic_year_id', $request->query('academic_year_id'));
            }

            if ($request->filled('academic_quarter_id')) {
                $qId = $request->query('academic_quarter_id');
                $quarter = AcademicQuarter::find($qId);
                $semKey = AssessmentController::resolveSemesterKey($quarter, $request->query('semester'));

                $query->where(function ($q) use ($qId, $semKey) {
                    $q->where('academic_quarter_id', $qId)
                      ->orWhere('semester', $semKey);
                });
            } elseif ($request->filled('semester')) {
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
     * Generate / Kalkulasi Massal Rapor Digital Akhir Triwulan
     * (Menghimpun Mapel Khusus + Mapel Reguler + Penunjang Muatan Lokal + Progres & Status Kenaikan Kelas).
     */
    public function generate(Request $request)
    {
        $validated = $request->validate([
            'class_group_id'      => 'required|exists:class_groups,id',
            'academic_year_id'    => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'semester'            => 'nullable|string|max:50',
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

            $eval = AssessmentController::buildQuarterlyEvaluation($classGroup, $yearId, $quarter);
            AssessmentController::syncReportCardsFromEvaluation($eval, $quarter, $validated['semester'] ?? null);

            DB::commit();

            $periodLabel = $quarter?->name ?? strtoupper(str_replace('_', ' ', $validated['semester'] ?? 'Triwulan'));

            return response()->json([
                'status'  => 'success',
                'message' => "Buku rapor digital ({$periodLabel}) berhasil dikalkulasi untuk {$classGroup->name}",
                'data'    => $eval['summary'] ?? [],
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
            'classGroup.education',
            'classGroup.program',
            'classGroup.homeroomTeacher',
            'academicYear',
            'academicQuarter',
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
        ]);

        try {
            $report->update([
                'homeroom_notes' => $validated['homeroom_notes'] ?? null,
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Catatan wali kelas berhasil diperbarui',
                'data'    => $report->fresh(['student', 'classGroup', 'academicYear', 'academicQuarter']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating report notes: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui catatan rapor',
            ], 500);
        }
    }

    public function exportPdf(string $id)
    {
        $report = ReportCard::with([
            'student',
            'classGroup.educationalInstitution',
            'classGroup.education',
            'classGroup.program',
            'classGroup.homeroomTeacher',
            'academicYear',
            'academicQuarter',
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
