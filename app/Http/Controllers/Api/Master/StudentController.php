<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\Student;
use App\Models\StudentClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Student::query();

            // Filter tipe siswa: mukim (santri) vs luar (reguler kalong)
            if ($request->has('is_mukim') && $request->query('is_mukim') !== '' && $request->query('is_mukim') !== 'all') {
                $val = filter_var($request->query('is_mukim'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($val !== null) {
                    $query->where('is_mukim', $val);
                }
            }

            if ($request->has('status')) {
                $query->where('status', $request->query('status'));
            }

            if ($request->has('gender')) {
                $query->where('gender', $request->query('gender'));
            }

            if ($request->has('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nis', 'like', "%{$search}%")
                      ->orWhere('nisn', 'like', "%{$search}%");
                });
            }

            $students = $query->orderBy('name', 'asc')->paginate($request->query('per_page', 20));

            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil diambil',
                'data'    => $students->items(),
                'meta'    => [
                    'current_page' => $students->currentPage(),
                    'last_page'    => $students->lastPage(),
                    'per_page'     => $students->perPage(),
                    'total'        => $students->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving students: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data siswa',
            ], 500);
        }
    }

    /**
     * Mengambil daftar santri aktif yang BELUM memiliki rombel (Unassigned Pool)
     * pada tahun akademik yang ditentukan (atau tahun akademik aktif).
     */
    public function unassigned(Request $request)
    {
        try {
            $academicYearId = $request->input('academic_year_id');
            if (empty($academicYearId)) {
                $activeYear = AcademicYear::active()->first();
                $academicYearId = $activeYear ? $activeYear->id : AcademicYear::latest('id')->value('id');
            }

            $query = Student::where('status', 'aktif')
                ->whereDoesntHave('studentClasses', function ($q) use ($academicYearId) {
                    $q->where('academic_year_id', $academicYearId)
                      ->where('status', 'aktif');
                });

            if ($request->has('gender') && in_array($request->query('gender'), ['L', 'P'])) {
                $query->where('gender', $request->query('gender'));
            }

            if ($request->has('is_mukim') && $request->query('is_mukim') !== '' && $request->query('is_mukim') !== 'all') {
                $val = filter_var($request->query('is_mukim'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($val !== null) {
                    $query->where('is_mukim', $val);
                }
            }

            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nis', 'like', "%{$search}%")
                      ->orWhere('nisn', 'like', "%{$search}%");
                });
            }

            $totalUnassigned = (clone $query)->count();

            if ($request->boolean('all')) {
                $students = $query->orderBy('name', 'asc')->get();
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Seluruh santri belum berombel berhasil diambil',
                    'total'   => $totalUnassigned,
                    'data'    => $students,
                ], 200);
            }

            $students = $query->orderBy('name', 'asc')->paginate($request->query('per_page', 25));

            return response()->json([
                'status'  => 'success',
                'message' => 'Daftar santri belum berombel berhasil diambil',
                'total'   => $totalUnassigned,
                'data'    => $students->items(),
                'meta'    => [
                    'current_page' => $students->currentPage(),
                    'last_page'    => $students->lastPage(),
                    'per_page'     => $students->perPage(),
                    'total'        => $students->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching unassigned students: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data santri belum berombel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Penempatan santri secara massal ke dalam 1 rombel pilihan (Bulk Assign).
     * Menerapkan SINGLE-ROMBEL POLICY: 1 santri = 1 rombel aktif di tahun ajaran yang sama.
     */
    public function bulkAssign(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'student_ids'    => 'required|array|min:1',
            'student_ids.*'  => 'required|exists:students,id',
            'joined_at'      => 'nullable|date',
            'note'           => 'nullable|string|max:255',
        ]);

        $group = ClassGroup::findOrFail($validated['class_group_id']);
        $joinedAt = $validated['joined_at'] ?? today();
        $note = $validated['note'] ?? "Penempatan ke rombel {$group->name}";

        try {
            DB::beginTransaction();

            $assignedCount = 0;

            foreach ($validated['student_ids'] as $studentId) {
                // Single-Rombel Policy: jika santri sudah punya rombel aktif di tahun ajaran yang sama, tutup rombel lamanya
                $existingActive = StudentClass::where('student_id', $studentId)
                    ->where('academic_year_id', $group->academic_year_id)
                    ->where('status', 'aktif')
                    ->first();

                if ($existingActive) {
                    if ($existingActive->class_group_id == $group->id) {
                        // Sudah aktif di rombel yang sama
                        continue;
                    }
                    // Selesaikan keanggotaan lama
                    $existingActive->update([
                        'status'  => 'pindah_level',
                        'left_at' => today(),
                        'note'    => "Pindah ke rombel {$group->name}",
                    ]);
                }

                // Tambahkan atau aktifkan di rombel tujuan
                StudentClass::updateOrCreate(
                    [
                        'student_id'     => $studentId,
                        'class_group_id' => $group->id,
                    ],
                    [
                        'academic_year_id'           => $group->academic_year_id,
                        'educational_institution_id' => $group->educational_institution_id,
                        'joined_at'                  => $joinedAt,
                        'left_at'                    => null,
                        'status'                     => 'aktif',
                        'note'                       => $note,
                    ]
                );

                $assignedCount++;
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Berhasil menempatkan {$assignedCount} santri ke rombel {$group->name}.",
                'data'    => [
                    'assigned_count' => $assignedCount,
                    'class_group'    => $group->name,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error during bulk assignment: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menempatkan santri ke rombel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Tarik data santri aktif dari SMPT secara on-demand (Pull Mechanism).
     * Menggunakan header X-Internal-Key.
     */
    public function pullFromSmpt(Request $request)
    {
        $smptCoreUrl = config('services.smpt.core_url', 'http://localhost:8000');
        $internalKey = config('services.smpt.internal_key', 'smpt-tarbiyah-internal-secret-2026');

        try {
            $response = Http::timeout(10)->withHeaders([
                'X-Internal-Key' => $internalKey,
                'Accept'         => 'application/json',
            ])->get("{$smptCoreUrl}/api/internal/students/active");

            if (!$response->successful()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal menghubungi SMPT: ' . $response->body(),
                ], $response->status() >= 400 && $response->status() < 600 ? $response->status() : 500);
            }

            $students = $response->json('data', []);
            $created = 0;
            $updated = 0;

            foreach ($students as $item) {
                if (empty($item['nis'])) {
                    continue;
                }

                $existing = Student::where('nis', $item['nis'])->first();

                Student::updateOrCreate(
                    ['nis' => $item['nis']],
                    [
                        'santri_id'    => $item['santri_id'] ?? null,
                        'nik'          => $item['nik'] ?? null,
                        'name'         => $item['name'],
                        'gender'       => $item['gender'] ?? 'L',
                        'is_mukim'     => true,
                        'parent_name'  => $item['parent_name'] ?? null,
                        'parent_phone' => $item['parent_phone'] ?? null,
                        'address'      => $item['address'] ?? null,
                        'born_in'      => $item['born_in'] ?? null,
                        'born_at'      => $item['born_at'] ?? null,
                        'photo'        => $item['photo'] ?? null,
                        'status'       => 'aktif',
                    ]
                );

                $existing ? $updated++ : $created++;
            }

            return response()->json([
                'status'  => 'success',
                'message' => "Sinkronisasi selesai: {$created} santri baru ditambahkan, {$updated} diperbarui.",
                'data'    => [
                    'total_fetched' => count($students),
                    'created'       => $created,
                    'updated'       => $updated,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error pulling students from SMPT: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan saat menarik data dari SMPT: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nis'          => 'required|string|max:50|unique:students,nis',
            'nisn'         => 'nullable|string|max:50',
            'nik'          => 'nullable|string|max:30',
            'name'         => 'required|string|max:255',
            'gender'       => 'required|in:L,P',
            'is_mukim'     => 'required|boolean', // false untuk siswa reguler luar
            'santri_id'    => 'nullable|integer',
            'born_in'      => 'nullable|string|max:255',
            'born_at'      => 'nullable|date',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
            'status'       => 'nullable|in:aktif,lulus,mutasi,keluar',
        ]);

        try {
            $student = Student::create($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Siswa berhasil didaftarkan',
                'data'    => $student,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendaftarkan siswa: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $student = Student::with(['activeClass.classGroup'])->find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail siswa berhasil diambil',
            'data'    => $student,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'nis'          => 'sometimes|required|string|max:50|unique:students,nis,' . $id,
            'nisn'         => 'nullable|string|max:50',
            'nik'          => 'nullable|string|max:30',
            'name'         => 'sometimes|required|string|max:255',
            'gender'       => 'sometimes|required|in:L,P',
            'is_mukim'     => 'sometimes|required|boolean',
            'born_in'      => 'nullable|string|max:255',
            'born_at'      => 'nullable|date',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
            'status'       => 'nullable|in:aktif,lulus,mutasi,keluar',
        ]);

        try {
            $student->update($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil diperbarui',
                'data'    => $student,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui data siswa',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        try {
            $student->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus data siswa',
            ], 500);
        }
    }
}