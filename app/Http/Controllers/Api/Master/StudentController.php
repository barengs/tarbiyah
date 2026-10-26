<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\Program;
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

            // Filter berdasarkan angkatan (period, mis. 1445-1446)
            if ($request->has('period')) {
                $query->where('period', $request->query('period'));
            }

            // Filter berdasarkan Program (Kubar / Tibyan)
            if ($request->has('program_id')) {
                $programId = (int) $request->query('program_id');
                if ($programId > 0) {
                    $query->where('program_id', $programId);
                } else {
                    $query->whereNull('program_id');
                }
            }

            // Filter berdasarkan jenjang pendidikan (melalui rombel aktif: class_group -> education_id)
            if ($request->has('education_id')) {
                $query->whereHas('studentClasses', function ($q) use ($request) {
                    $q->where('status', 'aktif')
                      ->whereHas('classGroup', function ($cg) use ($request) {
                          $cg->where('education_id', $request->query('education_id'));
                      });
                });
            }

            // Filter berdasarkan kelas (melalui rombel aktif: class_group -> education_class_id)
            if ($request->has('education_class_id')) {
                $query->whereHas('studentClasses', function ($q) use ($request) {
                    $q->where('status', 'aktif')
                      ->whereHas('classGroup', function ($cg) use ($request) {
                          $cg->where('education_class_id', $request->query('education_class_id'));
                      });
                });
            }

            // Filter berdasarkan rombel (class_group)
            if ($request->has('class_group_id')) {
                $query->whereHas('studentClasses', function ($q) use ($request) {
                    $q->where('status', 'aktif')
                      ->where('class_group_id', $request->query('class_group_id'));
                });
            }

            // Eager load rombel aktif untuk kolom Kelas/Rombel di frontend
            $query->with([
                'activeClass',
                'activeClass.classGroup',
                'activeClass.classGroup.education',
                'activeClass.classGroup.program',
                'activeClass.classGroup.educationClass',
                'program',
            ]);

            // Ringkasan komposisi siswa (dinamis, dihitung dari seluruh populasi siswa)
            $summaryTotal = Student::count();
            $summaryMukim = Student::where('is_mukim', true)->count();
            $summaryLuar  = $summaryTotal - $summaryMukim;
            $summary = [
                'total'         => $summaryTotal,
                'mukim'         => $summaryMukim,
                'luar'          => $summaryLuar,
                'mukim_percent' => $summaryTotal > 0 ? round(($summaryMukim / $summaryTotal) * 100, 1) : 0,
                'luar_percent'  => $summaryTotal > 0 ? round(($summaryLuar / $summaryTotal) * 100, 1) : 0,
            ];

            // Opsi filter: angkatan yang tersedia (dinamis dari data)
            $periodOptions = DB::table('students')->select('period')->whereNotNull('period')->distinct()->orderBy('period')->pluck('period')->all();
            $filterOptions = [
                'periods' => $periodOptions,
                'programs' => \App\Models\Program::query()->orderBy('name')->get(['id', 'name', 'code']),
            ];

            // Dukung pengambilan seluruh data tanpa pagination (misal untuk DataTable TanStack klien)
            $perPage = $request->query('per_page', 20);
            if ($request->boolean('all') || $perPage === 'all' || (int)$perPage >= 1000) {
                $allStudents = $query->orderBy('name', 'asc')->get();
                return response()->json([
                    'status'  => 'success',
                    'message' => 'Data siswa berhasil diambil',
                    'data'    => $allStudents,
                    'meta'    => [
                        'current_page' => 1,
                        'last_page'    => 1,
                        'per_page'     => $allStudents->count(),
                        'total'        => $allStudents->count(),
                        'summary'      => $summary,
                        'filter_options' => $filterOptions,
                    ],
                ], 200);
            }

            $students = $query->orderBy('name', 'asc')->paginate((int)$perPage);

            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil diambil',
                'data'    => $students->items(),
                'meta'    => [
                    'current_page' => $students->currentPage(),
                    'last_page'    => $students->lastPage(),
                    'per_page'     => $students->perPage(),
                    'total'        => $students->total(),
                    'summary'      => $summary,
                    'filter_options' => $filterOptions,
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
     * Penaturan program & jenjang & rombel secara massal.
     * Menerima daftar student_ids + salah satu/semua: program_id, class_group_id.
     * Satu santri dapat memiliki satu rombel aktif per tahun ajaran (single-rombel policy).
     */
    public function bulkAssignProgram(Request $request)
    {
        $validated = $request->validate([
            'student_ids'      => 'required|array|min:1',
            'student_ids.*'    => 'required|exists:students,id',
            'program_id'       => 'nullable|integer',
            'class_group_id'   => 'nullable|integer',
            'joined_at'        => 'nullable|date',
            'note'            => 'nullable|string|max:255',
        ]);

        $ids = $validated['student_ids'];
        $note = $validated['note'] ?? "Penaturan program massal";
        $joinedAt = $validated['joined_at'] ?? today();

        $group = null;
        if (!empty($validated['class_group_id'])) {
            $group = ClassGroup::with(['academicYear', 'educationalInstitution'])->findOrFail($validated['class_group_id']);
        }

        try {
            DB::beginTransaction();
            $affected = 0;

            foreach (Student::whereIn('id', $ids)->get() as $student) {
                // Atur program_id (0 = kosongkan / belum diatur)
                if (array_key_exists('program_id', $validated)) {
                    $student->program_id = $validated['program_id'] === 0 ? null : $validated['program_id'];
                }

                // Atur keanggotaan rombel aktif (single-rombel policy)
                if ($group) {
                    $existingActive = StudentClass::where('student_id', $student->id)
                        ->where('academic_year_id', $group->academic_year_id)
                        ->where('status', 'aktif')
                        ->first();

                    if ($existingActive && $existingActive->class_group_id !== $group->id) {
                        $existingActive->update([
                            'status'  => 'pindah_level',
                            'left_at' => today(),
                            'note'    => "Pindah ke rombel {$group->name} (massal)",
                        ]);
                    }

                    StudentClass::updateOrCreate([
                        'student_id'     => $student->id,
                        'class_group_id' => $group->id,
                    ], [
                        'academic_year_id'           => $group->academic_year_id,
                        'educational_institution_id' => $group->educational_institution_id,
                        'joined_at'                   => $joinedAt,
                        'left_at'                     => null,
                        'status'                        => 'aktif',
                        'note'                          => $note,
                    ]);
                }

                $student->save();
                $affected++;
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Berhasil mengatur program/rombel untuk {$affected} santri.",
                'data'    => [
                    'affected'       => $affected,
                    'program_id'     => $validated['program_id'] ?? null,
                    'class_group_id' => $group?->id,
                    'class_group'    => $group?->name,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error bulk-assigning program: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengatur program massal: ' . $e->getMessage(),
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
     * Pratinjau penarikan data santri dari SMPT sebelum dieksekusi.
     * Menghitung total santri di SMPT, santri baru, santri existing,
     * serta mengaudit data gender (santri saat ini 100% Banin / L).
     */
    public function previewPullFromSmpt(Request $request)
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
            $totalSmpt = count($students);

            // Cek santri yang sudah ada di Tarbiyah berdasarkan NIS
            $existingNisMap = Student::pluck('id', 'nis')->all();
            $alreadyInTarbiyah = 0;
            $newStudentsCount = 0;
            $femaleAnomalyCount = 0;
            $baninCount = 0;

            $previewList = [];

            foreach ($students as $item) {
                if (empty($item['nis'])) {
                    continue;
                }

                $nis = trim($item['nis']);
                $isNew = !isset($existingNisMap[$nis]);
                if ($isNew) {
                    $newStudentsCount++;
                } else {
                    $alreadyInTarbiyah++;
                }

                // Audit jenis kelamin: Santri saat ini TIDAK ADA perempuan.
                // Jika ada 'P' / 'Perempuan', tandai sebagai kesalahan algoritma!
                $rawGender = strtoupper(trim($item['gender'] ?? 'L'));
                if ($rawGender === 'P' || $rawGender === 'PEREMPUAN') {
                    $femaleAnomalyCount++;
                } else {
                    $baninCount++;
                }

                // Masukkan sampel preview (maksimal 10 baris)
                if (count($previewList) < 10) {
                    $previewList[] = [
                        'santri_id'   => $item['santri_id'] ?? null,
                        'nis'         => $nis,
                        'nik'         => !empty($item['nik']) ? ltrim(trim($item['nik']), "'\"") : null,
                        'name'        => $item['name'] ?? 'Santri',
                        'gender'      => 'L', // Seluruh santri dipastikan Banin (L)
                        'raw_gender'  => $rawGender,
                        'is_anomaly'  => ($rawGender === 'P' || $rawGender === 'PEREMPUAN'),
                        'village'     => $item['village'] ?? $item['address'] ?? '-',
                        'is_new'      => $isNew,
                    ];
                }
            }

            $hasAnomaly = $femaleAnomalyCount > 0;
            $anomalyMessage = $hasAnomaly 
                ? "Terdeteksi {$femaleAnomalyCount} data berindikasi jenis kelamin perempuan (kesalahan algoritma). Sesuai ketentuan pesantren saat ini seluruh santri adalah Banin (L). Sistem otomatis menstandarkan menjadi Banin (L)."
                : null;

            return response()->json([
                'status' => 'success',
                'data'   => [
                    'total_smpt'           => $totalSmpt,
                    'already_in_tarbiyah'  => $alreadyInTarbiyah,
                    'new_students'         => $newStudentsCount,
                    'banin_count'          => $baninCount,
                    'female_anomaly_count' => $femaleAnomalyCount,
                    'has_female_anomaly'   => $hasAnomaly,
                    'anomaly_message'      => $anomalyMessage,
                    'preview_sample'       => $previewList,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error previewing students from SMPT: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan saat memuat pratinjau data dari SMPT: ' . $e->getMessage(),
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
            $response = Http::timeout(15)->withHeaders([
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
            $anomalyCount = 0;

            foreach ($students as $item) {
                if (empty($item['nis'])) {
                    continue;
                }

                $nis = trim($item['nis']);
                $existing = Student::where('nis', $nis)->first();

                // Validasi & sanitasi tanggal lahir
                $bornAt = null;
                if (!empty($item['born_at'])) {
                    $ts = strtotime($item['born_at']);
                    if ($ts !== false && $ts > 0) {
                        $parsedDate = date('Y-m-d', $ts);
                        if ($parsedDate >= '1970-01-01' && $parsedDate <= date('Y-m-d')) {
                            $bornAt = $parsedDate;
                        }
                    }
                }

                // Sanitasi NIK, KK, & Telepon
                $nik = !empty($item['nik']) ? ltrim(trim($item['nik']), "'\"") : null;
                $kk  = !empty($item['kk']) ? ltrim(trim($item['kk']), "'\"") : null;
                $phone = !empty($item['parent_phone']) ? ltrim(trim($item['parent_phone']), "'\"") : null;
                if ($phone === '0822________' || $phone === '085_________') {
                    $phone = null;
                }

                // Validasi Gender: SANTRI 100% BANIN (L).
                // Jika data raw tertulis P/perempuan, itu kesalahan algoritma dan distandarkan ke L.
                $rawGender = strtoupper(trim($item['gender'] ?? 'L'));
                if ($rawGender === 'P' || $rawGender === 'PEREMPUAN') {
                    $anomalyCount++;
                }
                $gender = 'L'; // Tegakkan Laki-laki / Banin

                $parts = explode(' ', trim($item['name'] ?? ''), 2);
                $firstName = !empty($item['first_name']) ? trim($item['first_name']) : ($parts[0] ?? $nis);
                $lastName  = !empty($item['last_name']) ? trim($item['last_name']) : ($parts[1] ?? null);

                Student::updateOrCreate(
                    ['nis' => $nis],
                    [
                        'santri_id'      => $item['santri_id'] ?? null,
                        'parent_id'      => $item['parent_id'] ?? null, // NIK Wali Santri
                        'period'         => $item['period'] ?? null, // Angkatan (Hijriah)
                        'nik'            => $nik,
                        'kk'             => $kk,
                        'first_name'     => $firstName,
                        'last_name'      => $lastName,
                        'name'           => trim("{$firstName} {$lastName}"),
                        'gender'         => $gender, // 100% Banin
                        'is_mukim'       => true,
                        'village_id'     => $item['village_id'] ?? null,
                        'village'        => $item['village'] ?? null,
                        'district'       => $item['district'] ?? null,
                        'postal_code'    => $item['postal_code'] ?? null,
                        'phone'          => $phone,
                        'parent_name'    => $item['parent_name'] ?? null,
                        'parent_phone'   => $phone,
                        'address'        => $item['address'] ?? null,
                        'born_in'        => $item['born_in'] ?? null,
                        'born_at'        => $bornAt,
                        'last_education' => $item['last_education'] ?? null,
                        'hostel_id'      => $item['hostel_id'] ?? null,
                        'program_id'     => $item['program_id'] ?? null,
                        'photo'          => $item['photo'] ?? null,
                        'status'         => 'Aktif',
                    ]
                );

                $existing ? $updated++ : $created++;
            }

            return response()->json([
                'status'  => 'success',
                'message' => "Penarikan data selesai: {$created} santri baru berhasil ditambahkan, {$updated} santri diperbarui.",
                'data'    => [
                    'total_fetched'       => count($students),
                    'created'             => $created,
                    'updated'             => $updated,
                    'gender_audit'        => '100% Banin (L)',
                    'anomalies_corrected' => $anomalyCount,
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
            'nis'            => 'required|string|max:50|unique:students,nis',
            'santri_id'      => 'nullable|integer',
            'parent_id'      => 'nullable|string|max:30', // NIK Wali Santri
            'nik'            => 'nullable|string|max:30',
            'kk'             => 'nullable|string|max:30',
            'first_name'     => 'nullable|string|max:255',
            'last_name'      => 'nullable|string|max:255',
            'name'           => 'nullable|string|max:255',
            'gender'         => 'required|in:L,P',
            'is_mukim'       => 'required|boolean', // false untuk siswa reguler luar
            'period'         => 'nullable|string|max:20',
            'born_in'        => 'nullable|string|max:255',
            'born_at'        => 'nullable|date',
            'last_education' => 'nullable|string|max:255',
            'village_id'     => 'nullable|integer',
            'village'        => 'nullable|string|max:255',
            'district'       => 'nullable|string|max:255',
            'postal_code'    => 'nullable|string|max:10',
            'phone'          => 'nullable|string|max:30',
            'parent_name'    => 'nullable|string|max:255',
            'parent_phone'   => 'nullable|string|max:30',
            'address'        => 'nullable|string',
            'hostel_id'      => 'nullable|integer',
            'program_id'     => 'nullable|integer',
            'status'         => 'nullable|string',
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