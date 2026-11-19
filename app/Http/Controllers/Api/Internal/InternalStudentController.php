<?php

namespace App\Http\Controllers\Api\Internal;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\ReportCard;
use App\Models\Student;
use App\Models\StudentClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternalStudentController extends Controller
{
    /**
     * Endpoint untuk menerima sinkronisasi data santri dari Tamjid backend.
     * Dipanggil dengan header X-Internal-Key.
     */
    public function sync(Request $request)
    {
        $validated = $request->validate([
            'santri_id' => 'required|integer',
            'parent_id' => 'nullable|string|max:30',
            'nis' => 'required|string|max:255',
            'period' => 'nullable|string|max:20',
            'program_id' => 'nullable|integer',
            'hostel_id' => 'nullable|integer',
            'nik' => 'nullable|string|max:30',
            'nisn' => 'nullable|string|max:50',
            'name' => 'required|string|max:255',
            'gender' => 'required|in:L,P',
            'status' => 'nullable|string',
            'parent_name' => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address' => 'nullable|string',
            'born_in' => 'nullable|string|max:255',
            'born_at' => 'nullable|date',
            'photo' => 'nullable|string',
        ]);

        try {
            [$studentStatus, $classStatus] = $this->mapStatuses($validated['status'] ?? 'Aktif');

            $student = Student::updateOrCreate(
                ['nis' => $validated['nis']],
                [
                    'santri_id' => $validated['santri_id'],
                    'parent_id' => $validated['parent_id'] ?? null,
                    'period' => $validated['period'] ?? null,
                    'program_id' => $validated['program_id'] ?? null,
                    'hostel_id' => $validated['hostel_id'] ?? null,
                    'nik' => $validated['nik'] ?? null,
                    'nisn' => $validated['nisn'] ?? null,
                    'name' => $validated['name'],
                    'gender' => $validated['gender'],
                    'is_mukim' => true, // Santri dari Tamjid selalu santri mukim
                    'parent_name' => $validated['parent_name'] ?? null,
                    'parent_phone' => $validated['parent_phone'] ?? null,
                    'address' => $validated['address'] ?? null,
                    'born_in' => $validated['born_in'] ?? null,
                    'born_at' => $validated['born_at'] ?? null,
                    'photo' => $validated['photo'] ?? null,
                    'status' => $studentStatus,
                ]
            );

            // Jika santri non-aktif (lulus, keluar, mutasi), nonaktifkan keanggotaan kelas aktifnya
            if ($classStatus !== 'aktif') {
                StudentClass::where('student_id', $student->id)
                    ->where('status', 'aktif')
                    ->update([
                        'status' => $classStatus,
                        'left_at' => now(),
                    ]);
            }

            Log::info("Santri berhasil disinkronkan ke Tarbiyah: {$student->name} (NIS: {$student->nis})");

            return response()->json([
                'status' => 'success',
                'message' => 'Santri berhasil disinkronkan',
                'data' => $student,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Gagal sinkronisasi santri ke Tarbiyah: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal sinkronisasi: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Endpoint bulk sync: menerima daftar santri sekaligus dari Tamjid
     * (dipakai saat migrasi penuh / backfill).
     */
    public function bulkSync(Request $request)
    {
        $validated = $request->validate([
            'students' => 'required|array',
            'students.*.santri_id' => 'required|integer',
            'students.*.parent_id' => 'nullable|string|max:30',
            'students.*.nis' => 'required|string|max:255',
            'students.*.period' => 'nullable|string|max:20',
            'students.*.program_id' => 'nullable|integer',
            'students.*.hostel_id' => 'nullable|integer',
            'students.*.nik' => 'nullable|string|max:30',
            'students.*.nisn' => 'nullable|string|max:50',
            'students.*.name' => 'required|string|max:255',
            'students.*.gender' => 'required|in:L,P',
            'students.*.status' => 'nullable|string',
            'students.*.parent_name' => 'nullable|string|max:255',
            'students.*.parent_phone' => 'nullable|string|max:30',
            'students.*.address' => 'nullable|string',
            'students.*.born_in' => 'nullable|string|max:255',
            'students.*.born_at' => 'nullable|date',
            'students.*.photo' => 'nullable|string',
        ]);

        $created = 0;
        $updated = 0;

        foreach ($validated['students'] as $data) {
            [$studentStatus, $classStatus] = $this->mapStatuses($data['status'] ?? 'Aktif');

            $existing = Student::where('nis', $data['nis'])->first();
            $student = Student::updateOrCreate(
                ['nis' => $data['nis']],
                [
                    'santri_id' => $data['santri_id'],
                    'parent_id' => $data['parent_id'] ?? null,
                    'period' => $data['period'] ?? null,
                    'program_id' => $data['program_id'] ?? null,
                    'hostel_id' => $data['hostel_id'] ?? null,
                    'nik' => $data['nik'] ?? null,
                    'nisn' => $data['nisn'] ?? null,
                    'name' => $data['name'],
                    'gender' => $data['gender'],
                    'is_mukim' => true,
                    'parent_name' => $data['parent_name'] ?? null,
                    'parent_phone' => $data['parent_phone'] ?? null,
                    'address' => $data['address'] ?? null,
                    'born_in' => $data['born_in'] ?? null,
                    'born_at' => $data['born_at'] ?? null,
                    'photo' => $data['photo'] ?? null,
                    'status' => $studentStatus,
                ]
            );

            if ($classStatus !== 'aktif') {
                StudentClass::where('student_id', $student->id)
                    ->where('status', 'aktif')
                    ->update([
                        'status' => $classStatus,
                        'left_at' => now(),
                    ]);
            }

            $existing ? $updated++ : $created++;
        }

        Log::info("Bulk sync dari Tamjid: {$created} created, {$updated} updated.");

        return response()->json([
            'status' => 'success',
            'message' => 'Bulk sync selesai',
            'created' => $created,
            'updated' => $updated,
            'total' => count($validated['students']),
        ], 200);
    }

    /**
     * Endpoint untuk mengambil riwayat pendidikan & kelas santri berdasarkan NIS.
     * Dipanggil oleh Tamjid backend melalui Service-to-Service (X-Internal-Key).
     */
    public function getEducationHistory(string $nis)
    {
        $student = Student::where('nis', $nis)->first();

        if (! $student) {
            return response()->json([
                'status' => 'error',
                'message' => "Santri dengan NIS {$nis} belum terdaftar di sistem Tarbiyah.",
                'data' => null,
            ], 404);
        }

        // Ambil riwayat penempatan kelas
        $classes = StudentClass::with([
            'academicYear',
            'educationalInstitution',
            'classGroup.classroom',
            'classGroup.educationClass',
            'classGroup.homeroomTeacher',
        ])
            ->where('student_id', $student->id)
            ->orderByDesc('id')
            ->get();

        $activeClass = $classes->firstWhere('status', 'aktif');

        // Ambil riwayat rapor
        $reports = ReportCard::with(['academicYear', 'academicQuarter', 'classGroup'])
            ->where('student_id', $student->id)
            ->where('is_published', true)
            ->orderByDesc('id')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'nis' => $student->nis,
                'name' => $student->name,
                'current_class' => $activeClass ? [
                    'id' => $activeClass->id,
                    'academic_year' => $activeClass->academicYear?->year ?? '-',
                    'institution' => $activeClass->educationalInstitution?->institution_name ?? '-',
                    'class_group' => $activeClass->classGroup?->name ?? '-',
                    'grade_level' => $activeClass->classGroup?->educationClass?->name ?? null,
                    'classroom' => $activeClass->classGroup?->classroom?->name ?? '-',
                    'homeroom_teacher' => $activeClass->classGroup?->homeroomTeacher?->name ?? '-',
                    'joined_at' => optional($activeClass->joined_at)->toDateString(),
                    'status' => $activeClass->status,
                    'note' => $activeClass->note,
                ] : null,
                'history' => $classes->map(fn ($sc) => [
                    'id' => $sc->id,
                    'academic_year' => $sc->academicYear?->year ?? '-',
                    'institution' => $sc->educationalInstitution?->institution_name ?? '-',
                    'class_group' => $sc->classGroup?->name ?? '-',
                    'grade_level' => $sc->classGroup?->educationClass?->name ?? null,
                    'classroom' => $sc->classGroup?->classroom?->name ?? '-',
                    'homeroom_teacher' => $sc->classGroup?->homeroomTeacher?->name ?? '-',
                    'joined_at' => optional($sc->joined_at)->toDateString(),
                    'left_at' => optional($sc->left_at)->toDateString(),
                    'status' => $sc->status,
                    'note' => $sc->note,
                ]),
                'reports' => $reports->map(fn ($rp) => [
                    'id' => $rp->id,
                    'academic_year' => $rp->academicYear?->year ?? '-',
                    'quarter' => $rp->academicQuarter?->name ?? '-',
                    'class_group' => $rp->classGroup?->name ?? '-',
                    'average_score' => $rp->average_score,
                    'rank' => $rp->rank,
                    'notes' => $rp->notes,
                ]),
            ],
        ]);
    }

    /**
     * Batch ambil kelas aktif santri berdasarkan daftar NIS untuk Tamjid.
     * POST /api/internal/students/current-classes
     */
    public function getCurrentClasses(Request $request)
    {
        $validated = $request->validate([
            'nis_list' => 'required|array|max:500',
            'nis_list.*' => 'required|string|max:50',
        ]);

        $students = Student::whereIn('nis', $validated['nis_list'])->get(['id', 'nis']);
        if ($students->isEmpty()) {
            return response()->json([
                'status' => 'success',
                'data' => [],
            ]);
        }

        $nisByStudentId = $students->pluck('nis', 'id');

        $activeClasses = StudentClass::with([
            'academicYear',
            'educationalInstitution',
            'classGroup.classroom',
            'classGroup.educationClass',
        ])
            ->whereIn('student_id', $students->pluck('id'))
            ->where('status', 'aktif')
            ->orderByDesc('id')
            ->get()
            ->unique('student_id');

        $result = [];
        foreach ($activeClasses as $sc) {
            $nis = $nisByStudentId->get($sc->student_id);
            if (! $nis) {
                continue;
            }

            $result[$nis] = [
                'id' => $sc->id,
                'class_group_id' => $sc->class_group_id,
                'class_name' => $sc->classGroup?->name ?? '-',
                'class_group' => $sc->classGroup?->name ?? '-',
                'grade_level' => $sc->classGroup?->educationClass?->name ?? null,
                'institution' => $sc->educationalInstitution?->institution_name ?? '-',
                'classroom' => $sc->classGroup?->classroom?->name ?? '-',
                'academic_year' => $sc->academicYear?->year ?? '-',
            ];
        }

        return response()->json([
            'status' => 'success',
            'data' => $result,
        ]);
    }

    /**
     * Endpoint internal untuk Tamjid menarik master triwulan ujian (academic_quarters).
     * GET /api/internal/academic-quarters
     */
    public function getAcademicQuarters()
    {
        $quarters = AcademicQuarter::with('academicYear')
            ->orderByDesc('academic_year_id')
            ->orderBy('id')
            ->get()
            ->map(fn ($q) => [
                'id' => $q->id,
                'academic_year_id' => $q->academic_year_id,
                'academic_year' => $q->academicYear?->year,
                'name' => $q->name,
                'start_date' => optional($q->start_date)->toDateString(),
                'end_date' => optional($q->end_date)->toDateString(),
                'active' => (bool) $q->active,
            ]);

        return response()->json([
            'status' => 'success',
            'data' => $quarters,
        ]);
    }

    /**
     * Endpoint internal untuk menerima push sinkronisasi tahun akademik dari Tamjid.
     * POST /api/internal/academic-years/sync
     */
    public function syncAcademicYears(Request $request)
    {
        $validated = $request->validate([
            'academic_years' => 'required|array',
            'academic_years.*.year' => 'required|string|max:50',
            'academic_years.*.start_date' => 'nullable|string',
            'academic_years.*.end_date' => 'nullable|string',
            'academic_years.*.active' => 'nullable|boolean',
            'academic_years.*.description' => 'nullable|string',
        ]);

        $synced = \App\Http\Controllers\Api\Master\AcademicYearController::applySmptYearsSync($validated['academic_years']);

        return response()->json([
            'status' => 'success',
            'message' => "Berhasil menyinkronkan {$synced} tahun akademik dari Tamjid.",
            'synced' => $synced,
        ]);
    }

    /**
     * Petakan status Tamjid ke enum students.status (Title Case) & student_classes.status (lowercase).
     *
     * @return array{0: string, 1: string}
     */
    private function mapStatuses(?string $raw): array
    {
        $key = strtolower(trim($raw ?? 'aktif'));

        $studentStatusMap = [
            'aktif' => 'Aktif',
            'tugas' => 'Tugas',
            'lulus' => 'Lulus',
            'mutasi' => 'Mutasi',
            'keluar' => 'Keluar',
            'dikeluarkan' => 'Dikeluarkan',
            'tidak aktif' => 'Tidak Aktif',
        ];

        $classStatusMap = [
            'aktif' => 'aktif',
            'tugas' => 'aktif',
            'lulus' => 'lulus',
            'mutasi' => 'mutasi',
            'keluar' => 'keluar',
            'dikeluarkan' => 'keluar',
            'tidak aktif' => 'keluar',
        ];

        return [
            $studentStatusMap[$key] ?? 'Aktif',
            $classStatusMap[$key] ?? 'aktif',
        ];
    }
}
