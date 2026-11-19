<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class TeacherController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:guru.create', only: ['store', 'pullFromSmpt']),
            new Middleware('permission:guru.update', only: ['update', 'syncStudies']),
            new Middleware('permission:guru.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $query = Teacher::with(['user', 'studies.educationalInstitution']);

            if ($request->has('status')) {
                $query->where('status', $request->query('status'));
            }

            if ($request->has('is_active')) {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            if ($request->has('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('nip', 'like', "%{$search}%")
                        ->orWhere('specialization', 'like', "%{$search}%");
                });
            }

            $teachers = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data guru berhasil diambil',
                'data' => $teachers,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving teachers: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data guru',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nip' => 'nullable|string|max:50|unique:teachers,nip',
            'name' => 'required|string|max:255',
            'gender' => 'required|in:L,P',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'specialization' => 'nullable|string|max:255',
            'photo' => 'nullable|string',
            'status' => 'required|in:tetap,honorer,luar',
            'staff_id' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
            'create_user' => 'nullable|boolean',
            'password' => 'nullable|string|min:6',
            'study_ids' => 'nullable|array',
            'study_ids.*' => 'exists:studies,id',
        ]);

        try {
            DB::beginTransaction();

            $userId = null;
            if (! empty($validated['create_user']) && ! empty($validated['email'])) {
                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password'] ?? 'guru12345'),
                    'role' => 'guru',
                ]);
                $userId = $user->id;
            }

            $teacher = Teacher::create([
                'user_id' => $userId,
                'staff_id' => $validated['staff_id'] ?? null,
                'nip' => $validated['nip'] ?? null,
                'name' => $validated['name'],
                'gender' => $validated['gender'],
                'phone' => $validated['phone'] ?? null,
                'email' => $validated['email'] ?? null,
                'specialization' => $validated['specialization'] ?? null,
                'photo' => $validated['photo'] ?? null,
                'status' => $validated['status'],
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (! empty($validated['study_ids'])) {
                $teacher->studies()->sync($validated['study_ids']);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Guru berhasil didaftarkan',
                'data' => $teacher->load(['user', 'studies.educationalInstitution']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating teacher: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mendaftarkan guru: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $teacher = Teacher::with([
            'user',
            'studies.educationalInstitution',
            'homeroomClassGroups.education',
            'homeroomClassGroups.academicYear',
            'schedules.study',
            'schedules.classGroup.education',
            'schedules.lessonHour',
            'schedules.classroom',
        ])->find($id);

        if (! $teacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        // Auto-fetch & sync foto guru dari Tamjid jika belum tersimpan
        if (empty($teacher->photo) && ($teacher->staff_id || $teacher->nip)) {
            try {
                $photo = null;
                $smptCoreUrl = config('services.smpt.core_url', 'http://localhost:8000');
                $internalKey = config('services.smpt.internal_key', 'smpt-tarbiyah-internal-secret-2026');

                $resp = Http::timeout(3)->withHeaders([
                    'X-Internal-Key' => $internalKey,
                    'Accept' => 'application/json',
                ])->get("{$smptCoreUrl}/api/internal/staff-photo", array_filter([
                    'staff_id' => $teacher->staff_id,
                    'nip' => $teacher->nip,
                ]));

                if ($resp->successful() && $resp->json('data.photo')) {
                    $photo = $resp->json('data.photo');
                } elseif ($resp->successful() && $resp->json('photo')) {
                    $photo = $resp->json('photo');
                } elseif (Schema::hasTable('pesantren.staff')) {
                    $staff = DB::table('pesantren.staff')
                        ->where(function ($q) use ($teacher) {
                            if ($teacher->staff_id) {
                                $q->where('id', $teacher->staff_id);
                            }
                            if ($teacher->nip) {
                                $q->orWhere('nip', $teacher->nip)->orWhere('code', $teacher->nip);
                            }
                        })
                        ->whereNotNull('photo')
                        ->first(['photo']);
                    if ($staff && !empty($staff->photo)) {
                        $photo = $staff->photo;
                    }
                }

                if ($photo) {
                    $teacher->photo = $photo;
                    $teacher->saveQuietly();
                }
            } catch (\Throwable $e) {
                Log::warning('Gagal auto-sync foto guru dari Tamjid: '.$e->getMessage());
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail guru berhasil diambil',
            'data' => $teacher,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $teacher = Teacher::find($id);

        if (! $teacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'nip' => 'nullable|string|max:50|unique:teachers,nip,'.$id,
            'name' => 'sometimes|required|string|max:255',
            'gender' => 'sometimes|required|in:L,P',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'specialization' => 'nullable|string|max:255',
            'photo' => 'nullable|string',
            'status' => 'sometimes|required|in:tetap,honorer,luar',
            'is_active' => 'nullable|boolean',
            'study_ids' => 'nullable|array',
            'study_ids.*' => 'exists:studies,id',
        ]);

        try {
            $teacher->update($validated);

            if (isset($validated['study_ids'])) {
                $teacher->studies()->sync($validated['study_ids']);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Data guru berhasil diperbarui',
                'data' => $teacher->fresh(['user', 'studies.educationalInstitution']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating teacher: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui data guru',
            ], 500);
        }
    }

    /**
     * Sinkronisasi mata pelajaran yang diampu oleh guru (Pemetaan Mapel).
     */
    public function syncStudies(Request $request, string $id)
    {
        $teacher = Teacher::find($id);

        if (! $teacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'study_ids' => 'present|array',
            'study_ids.*' => 'exists:studies,id',
        ]);

        try {
            $teacher->studies()->sync($validated['study_ids']);

            return response()->json([
                'status' => 'success',
                'message' => 'Penugasan mata pelajaran berhasil diperbarui',
                'data' => $teacher->fresh(['user', 'studies.educationalInstitution']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error assigning studies to teacher: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan penugasan mata pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $teacher = Teacher::find($id);

        if (! $teacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        try {
            $teacher->studies()->detach();
            $teacher->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Data guru berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting teacher: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus data guru',
            ], 500);
        }
    }

    /**
     * Pratinjau data guru/staf ber-role guru dari Tamjid sebelum ditarik.
     * GET /api/master/teachers/pull-preview
     */
    public function previewPullFromSmpt()
    {
        $smptCoreUrl = config('services.smpt.core_url', 'http://localhost:8000');
        $internalKey = config('services.smpt.internal_key', 'smpt-tarbiyah-internal-secret-2026');

        try {
            $response = Http::timeout(10)->withHeaders([
                'X-Internal-Key' => $internalKey,
                'Accept' => 'application/json',
            ])->get("{$smptCoreUrl}/api/internal/teachers");

            if (! $response->successful()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal menghubungi Tamjid: '.$response->body(),
                ], $response->status() >= 400 && $response->status() < 600 ? $response->status() : 500);
            }

            $teachers = $response->json('data', []);
            $existingStaffIds = Teacher::whereNotNull('staff_id')->pluck('id', 'staff_id')->all();
            $existingNips = Teacher::whereNotNull('nip')->pluck('id', 'nip')->all();

            $alreadyInTarbiyah = 0;
            $newTeachers = 0;
            $previewSample = [];

            foreach ($teachers as $item) {
                $staffId = $item['staff_id'] ?? null;
                $nip = ! empty($item['nip']) ? trim($item['nip']) : null;

                $exists = ($staffId && isset($existingStaffIds[$staffId])) || ($nip && isset($existingNips[$nip]));
                if ($exists) {
                    $alreadyInTarbiyah++;
                } else {
                    $newTeachers++;
                }

                if (count($previewSample) < 10) {
                    $previewSample[] = [
                        'staff_id' => $staffId,
                        'nip' => $nip ?? '-',
                        'name' => $item['name'] ?? 'Guru',
                        'gender' => $item['gender'] ?? 'L',
                        'phone' => $item['phone'] ?? '-',
                        'roles' => $item['roles'] ?? [],
                        'photo' => $item['photo'] ?? null,
                        'is_new' => ! $exists,
                    ];
                }
            }

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_smpt' => count($teachers),
                    'already_in_tarbiyah' => $alreadyInTarbiyah,
                    'new_teachers' => $newTeachers,
                    'preview_sample' => $previewSample,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error previewing teachers from Tamjid: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat memuat pratinjau guru dari Tamjid: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Tarik & sinkronisasi data guru/staf ber-role guru dari Tamjid.
     * POST /api/master/teachers/pull-from-smpt
     */
    public function pullFromSmpt()
    {
        $smptCoreUrl = config('services.smpt.core_url', 'http://localhost:8000');
        $internalKey = config('services.smpt.internal_key', 'smpt-tarbiyah-internal-secret-2026');

        try {
            $response = Http::timeout(15)->withHeaders([
                'X-Internal-Key' => $internalKey,
                'Accept' => 'application/json',
            ])->get("{$smptCoreUrl}/api/internal/teachers");

            if (! $response->successful()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Gagal menghubungi Tamjid: '.$response->body(),
                ], $response->status() >= 400 && $response->status() < 600 ? $response->status() : 500);
            }

            $teachers = $response->json('data', []);
            $created = 0;
            $updated = 0;

            foreach ($teachers as $item) {
                $staffId = $item['staff_id'] ?? null;
                $nip = ! empty($item['nip']) ? trim($item['nip']) : null;
                if (! $staffId && ! $nip) {
                    continue;
                }

                $existing = null;
                if ($staffId) {
                    $existing = Teacher::where('staff_id', $staffId)->first();
                }
                if (! $existing && $nip) {
                    $existing = Teacher::where('nip', $nip)->first();
                }

                $payload = [
                    'staff_id' => $staffId,
                    'nip' => $nip,
                    'name' => trim($item['name'] ?? 'Guru'),
                    'gender' => ($item['gender'] ?? 'L') === 'P' ? 'P' : 'L',
                    'phone' => $item['phone'] ?? null,
                    'email' => $item['email'] ?? null,
                    'photo' => $item['photo'] ?? null,
                    'status' => $item['status'] ?? 'tetap',
                    'is_active' => (bool) ($item['is_active'] ?? true),
                ];

                if ($existing) {
                    $existing->update($payload);
                    $updated++;
                } else {
                    Teacher::create($payload);
                    $created++;
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Sinkronisasi selesai: {$created} guru baru ditambahkan, {$updated} guru diperbarui.",
                'data' => [
                    'created' => $created,
                    'updated' => $updated,
                    'total' => $created + $updated,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Error pulling teachers from Tamjid: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan saat menarik data guru dari Tamjid: '.$e->getMessage(),
            ], 500);
        }
    }
}
