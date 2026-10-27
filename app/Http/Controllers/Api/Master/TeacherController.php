<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class TeacherController extends Controller
{
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
                'status'  => 'success',
                'message' => 'Data guru berhasil diambil',
                'data'    => $teachers,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving teachers: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data guru',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nip'            => 'nullable|string|max:50|unique:teachers,nip',
            'name'           => 'required|string|max:255',
            'gender'         => 'required|in:L,P',
            'phone'          => 'nullable|string|max:30',
            'email'          => 'nullable|email|max:255',
            'specialization' => 'nullable|string|max:255',
            'status'         => 'required|in:tetap,honorer,luar',
            'staff_id'       => 'nullable|integer',
            'is_active'      => 'nullable|boolean',
            'create_user'    => 'nullable|boolean',
            'password'       => 'nullable|string|min:6',
            'study_ids'      => 'nullable|array',
            'study_ids.*'    => 'exists:studies,id',
        ]);

        try {
            DB::beginTransaction();

            $userId = null;
            if (!empty($validated['create_user']) && !empty($validated['email'])) {
                $user = User::create([
                    'name'     => $validated['name'],
                    'email'    => $validated['email'],
                    'password' => Hash::make($validated['password'] ?? 'guru12345'),
                    'role'     => 'guru',
                ]);
                $userId = $user->id;
            }

            $teacher = Teacher::create([
                'user_id'        => $userId,
                'staff_id'       => $validated['staff_id'] ?? null,
                'nip'            => $validated['nip'] ?? null,
                'name'           => $validated['name'],
                'gender'         => $validated['gender'],
                'phone'          => $validated['phone'] ?? null,
                'email'          => $validated['email'] ?? null,
                'specialization' => $validated['specialization'] ?? null,
                'status'         => $validated['status'],
                'is_active'      => $validated['is_active'] ?? true,
            ]);

            if (!empty($validated['study_ids'])) {
                $teacher->studies()->sync($validated['study_ids']);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Guru berhasil didaftarkan',
                'data'    => $teacher->load(['user', 'studies.educationalInstitution']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating teacher: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendaftarkan guru: ' . $e->getMessage(),
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

        if (!$teacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail guru berhasil diambil',
            'data'    => $teacher,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $teacher = Teacher::find($id);

        if (!$teacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'nip'            => 'nullable|string|max:50|unique:teachers,nip,' . $id,
            'name'           => 'sometimes|required|string|max:255',
            'gender'         => 'sometimes|required|in:L,P',
            'phone'          => 'nullable|string|max:30',
            'email'          => 'nullable|email|max:255',
            'specialization' => 'nullable|string|max:255',
            'status'         => 'sometimes|required|in:tetap,honorer,luar',
            'is_active'      => 'nullable|boolean',
            'study_ids'      => 'nullable|array',
            'study_ids.*'    => 'exists:studies,id',
        ]);

        try {
            $teacher->update($validated);

            if (isset($validated['study_ids'])) {
                $teacher->studies()->sync($validated['study_ids']);
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Data guru berhasil diperbarui',
                'data'    => $teacher->fresh(['user', 'studies.educationalInstitution']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating teacher: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
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

        if (!$teacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'study_ids'   => 'present|array',
            'study_ids.*' => 'exists:studies,id',
        ]);

        try {
            $teacher->studies()->sync($validated['study_ids']);

            return response()->json([
                'status'  => 'success',
                'message' => 'Penugasan mata pelajaran berhasil diperbarui',
                'data'    => $teacher->fresh(['user', 'studies.educationalInstitution']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error assigning studies to teacher: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan penugasan mata pelajaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $teacher = Teacher::find($id);

        if (!$teacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data guru tidak ditemukan',
            ], 404);
        }

        try {
            $teacher->studies()->detach();
            $teacher->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data guru berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting teacher: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus data guru',
            ], 500);
        }
    }
}
