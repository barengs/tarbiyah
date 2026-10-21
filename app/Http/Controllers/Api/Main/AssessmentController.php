<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentCategory;
use App\Models\AssessmentScore;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\Study;
use App\Models\Student;
use App\Services\BankSantriService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AssessmentController extends Controller
{
    public function categories()
    {
        return response()->json([
            'status'  => 'success',
            'message' => 'Kategori penilaian berhasil diambil',
            'data'    => AssessmentCategory::where('is_active', true)->get(),
        ], 200);
    }

    public function index(Request $request)
    {
        try {
            $query = Assessment::with(['classGroup', 'study', 'teacher', 'category'])
                ->withCount('scores');

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->has('study_id')) {
                $query->where('study_id', $request->query('study_id'));
            }

            if ($request->has('category_id')) {
                $query->where('category_id', $request->query('category_id'));
            }

            $assessments = $query->orderBy('date', 'desc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data penilaian berhasil diambil',
                'data'    => $assessments,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving assessments: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data penilaian',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'class_group_id'   => 'required|exists:class_groups,id',
            'study_id'         => 'required|exists:studies,id',
            'teacher_id'       => 'required|exists:teachers,id',
            'category_id'      => 'required|exists:assessment_categories,id',
            'title'            => 'required|string|max:255',
            'description'      => 'nullable|string',
            'date'             => 'required|date',
            'max_score'        => 'nullable|numeric|min:1|max:100',
        ]);

        try {
            DB::beginTransaction();

            $assessment = Assessment::create($validated);

            // Inisialisasi lembar nilai untuk semua siswa aktif di rombel ini
            $activeStudents = StudentClass::where('class_group_id', $validated['class_group_id'])
                ->where('status', 'aktif')
                ->get();

            $scores = [];
            $now = now();
            foreach ($activeStudents as $sc) {
                $scores[] = [
                    'assessment_id' => $assessment->id,
                    'student_id'    => $sc->student_id,
                    'score'         => 0,
                    'feedback'      => null,
                    'created_at'    => $now,
                    'updated_at'    => $now,
                ];
            }

            if (!empty($scores)) {
                AssessmentScore::insert($scores);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Asesmen/Penilaian baru berhasil dibuat',
                'data'    => $assessment->load(['classGroup', 'study', 'teacher', 'category', 'scores.student']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating assessment: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat asesmen: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $assessment = Assessment::with([
            'classGroup',
            'study',
            'teacher',
            'category',
            'scores.student'
        ])->find($id);

        if (!$assessment) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penilaian tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail penilaian berhasil diambil',
            'data'    => $assessment,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $assessment = Assessment::find($id);

        if (!$assessment) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penilaian tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'date'        => 'sometimes|required|date',
            'max_score'   => 'nullable|numeric|min:1|max:100',
        ]);

        try {
            $assessment->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Penilaian berhasil diperbarui',
                'data'    => $assessment->fresh(['classGroup', 'study', 'category']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating assessment: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui penilaian',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $assessment = Assessment::find($id);

        if (!$assessment) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Penilaian tidak ditemukan',
            ], 404);
        }

        try {
            $assessment->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Penilaian berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting assessment: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus penilaian',
            ], 500);
        }
    }

    /**
     * Batch simpan nilai siswa untuk suatu asesmen.
     */
    public function saveScores(Request $request, string $id)
    {
        $assessment = Assessment::findOrFail($id);

        $validated = $request->validate([
            'scores'              => 'required|array',
            'scores.*.student_id' => 'required|exists:students,id',
            'scores.*.score'      => 'required|numeric|min:0|max:100',
            'scores.*.feedback'   => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['scores'] as $item) {
                AssessmentScore::updateOrCreate(
                    [
                        'assessment_id' => $assessment->id,
                        'student_id'    => $item['student_id'],
                    ],
                    [
                        'score'    => $item['score'],
                        'feedback' => $item['feedback'] ?? null,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Nilai siswa berhasil disimpan',
                'data'    => $assessment->fresh('scores.student'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving scores: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan nilai siswa',
            ], 500);
        }
    }

    /**
     * Leger Nilai Kelas (Rangkuman Nilai Seluruh Mapel per Siswa).
     */
    public function classGradebook(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
        ]);

        try {
            $classGroup = ClassGroup::with('educationalInstitution')->findOrFail($validated['class_group_id']);
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get();

            $studies = Study::where(function ($q) use ($classGroup) {
                $q->where('educational_institution_id', $classGroup->educational_institution_id)
                  ->orWhereNull('educational_institution_id');
            })->where('is_active', true)->get();

            // Hitung rata-rata nilai tiap santri per mapel
            $gradebook = [];
            foreach ($students as $sc) {
                $sId = $sc->student_id;
                $studentGrades = [];
                $totalScoreSum = 0;
                $studyCount = 0;

                foreach ($studies as $study) {
                    $avgScore = AssessmentScore::whereHas('assessment', function ($q) use ($classGroup, $study) {
                        $q->where('class_group_id', $classGroup->id)
                          ->where('study_id', $study->id);
                    })->where('student_id', $sId)->avg('score');

                    $scoreVal = $avgScore !== null ? round($avgScore, 1) : null;
                    $studentGrades[$study->id] = [
                        'study_name' => $study->name,
                        'kkm'        => (float)$study->kkm,
                        'score'      => $scoreVal,
                        'is_pass'    => $scoreVal !== null ? ($scoreVal >= $study->kkm) : null,
                    ];

                    if ($scoreVal !== null) {
                        $totalScoreSum += $scoreVal;
                        $studyCount++;
                    }
                }

                $overallAverage = $studyCount > 0 ? round($totalScoreSum / $studyCount, 1) : 0;

                $gradebook[] = [
                    'student_id'      => $sId,
                    'name'            => $sc->student->name,
                    'nis'             => $sc->student->nis,
                    'gender'          => $sc->student->gender,
                    'grades'          => $studentGrades,
                    'average'         => $overallAverage,
                ];
            }

            // Urutkan ranking berdasarkan average tertinggi
            usort($gradebook, fn($a, $b) => $b['average'] <=> $a['average']);
            foreach ($gradebook as $idx => &$item) {
                $item['rank'] = $idx + 1;
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Leger nilai rombel berhasil diambil',
                'data'    => [
                    'class_group' => $classGroup->name,
                    'studies'     => $studies,
                    'students'    => $gradebook,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error generating class gradebook: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat leger nilai',
            ], 500);
        }
    }

    /**
     * GET /api/main/assessments/exam-eligibility?nis={nis}
     * Cek kelayakan ujian 1 santri (dispensasi tunggakan via bank-santri).
     */
    public function examEligibility(Request $request, BankSantriService $bankSantri)
    {
        $validated = $request->validate([
            'nis' => 'required|string|exists:students,nis',
        ]);

        $student = Student::where('nis', $validated['nis'])->firstOrFail();

        return response()->json([
            'status'  => 'success',
            'data'    => $bankSantri->checkExamEligibility($student),
        ]);
    }

    /**
     * GET /api/main/assessments/class-exam-eligibility/{class_group_id}
     * Rekap kelayakan ujian seluruh siswa pada satu rombel (untuk panitia ujian).
     */
    public function classExamEligibility(string $classGroupId, BankSantriService $bankSantri)
    {
        $studentIds = StudentClass::where('class_group_id', $classGroupId)
            ->where('status', 'aktif')
            ->pluck('student_id');

        $students = Student::whereIn('id', $studentIds)->get();

        $results = $students->map(function (Student $student) use ($bankSantri) {
            return [
                'nis'         => $student->nis,
                'name'        => $student->name,
                'is_mukim'    => $student->is_mukim,
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
}
