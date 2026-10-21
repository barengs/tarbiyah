<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\ClassGroupSubject;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassGroupController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = ClassGroup::with([
                'academicYear',
                'program',
                'educationalInstitution',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher'
            ])->withCount(['studentClasses as students_count' => function ($q) {
                $q->where('status', 'aktif');
            }]);

            if ($request->has('academic_year_id') && $request->query('academic_year_id')) {
                $query->where('academic_year_id', $request->query('academic_year_id'));
            }

            if ($request->has('educational_institution_id') && $request->query('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            if ($request->has('progression_type') && $request->query('progression_type')) {
                $query->where('progression_type', $request->query('progression_type'));
            }

            if ($request->has('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%")
                      ->orWhere('target_level', 'like', "%{$search}%");
                });
            }

            $groups = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data rombel/halaqah berhasil diambil',
                'data'    => $groups,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving class groups: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data rombel',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id'           => 'required|exists:academic_years,id',
            'educational_institution_id' => 'required|exists:educational_institutions,id',
            'education_id'               => 'nullable|exists:educations,id',
            'classroom_id'               => 'nullable|exists:classrooms,id',
            'homeroom_teacher_id'        => 'nullable|exists:teachers,id',
            'code'                       => 'nullable|string|max:30',
            'name'                       => 'required|string|max:255',
            'gender'                     => 'nullable|in:L,P,campur',
            'progression_type'           => 'required|in:semester,leveling',
            'target_level'               => 'nullable|string|max:100',
            'capacity'                   => 'nullable|integer',
            'is_active'                  => 'nullable|boolean',
        ]);

        try {
            $group = ClassGroup::create($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rombongan belajar berhasil dibuat',
                'data'    => $group->load(['academicYear', 'educationalInstitution', 'education', 'homeroomTeacher']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating class group: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat rombel: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $group = ClassGroup::with([
            'academicYear',
            'educationalInstitution',
            'education',
            'classroom',
            'homeroomTeacher',
            'studentClasses.student',
            'subjects.study',
            'subjects.teacher'
        ])->find($id);

        if (!$group) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rombel tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail rombel berhasil diambil',
            'data'    => $group,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $group = ClassGroup::find($id);

        if (!$group) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rombel tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'education_id'        => 'nullable|exists:educations,id',
            'classroom_id'        => 'nullable|exists:classrooms,id',
            'homeroom_teacher_id' => 'nullable|exists:teachers,id',
            'code'                => 'nullable|string|max:30',
            'name'                => 'sometimes|required|string|max:255',
            'gender'              => 'nullable|in:L,P,campur',
            'progression_type'    => 'sometimes|required|in:semester,leveling',
            'target_level'        => 'nullable|string|max:100',
            'capacity'            => 'nullable|integer',
            'is_active'           => 'nullable|boolean',
        ]);

        try {
            $group->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Rombel berhasil diperbarui',
                'data'    => $group->fresh(['academicYear', 'educationalInstitution', 'education', 'homeroomTeacher']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating class group: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui rombel',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $group = ClassGroup::find($id);

        if (!$group) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rombel tidak ditemukan',
            ], 404);
        }

        try {
            $group->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Rombel berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting class group: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus rombel',
            ], 500);
        }
    }

    /**
     * Tambah siswa ke dalam rombel.
     */
    public function addStudent(Request $request, string $id)
    {
        $group = ClassGroup::findOrFail($id);

        $validated = $request->validate([
            'student_id' => 'required|exists:students,id',
            'joined_at'  => 'nullable|date',
            'note'       => 'nullable|string',
        ]);

        try {
            $existing = StudentClass::where('student_id', $validated['student_id'])
                ->where('class_group_id', $group->id)
                ->first();

            if ($existing) {
                if ($existing->status === 'aktif') {
                    return response()->json([
                        'status'  => 'error',
                        'message' => 'Siswa sudah terdaftar dan aktif di rombel ini',
                    ], 422);
                }
                $existing->update([
                    'status'    => 'aktif',
                    'joined_at' => $validated['joined_at'] ?? today(),
                    'left_at'   => null,
                ]);
                $studentClass = $existing;
            } else {
                $studentClass = StudentClass::create([
                    'academic_year_id'           => $group->academic_year_id,
                    'educational_institution_id' => $group->educational_institution_id,
                    'student_id'                 => $validated['student_id'],
                    'class_group_id'             => $group->id,
                    'joined_at'                  => $validated['joined_at'] ?? today(),
                    'status'                     => 'aktif',
                    'note'                       => $validated['note'] ?? null,
                ]);
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Siswa berhasil dimasukkan ke rombel',
                'data'    => $studentClass->load('student'),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error adding student to class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan siswa ke rombel: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Keluarkan siswa dari rombel.
     */
    public function removeStudent(string $id, string $studentId)
    {
        $membership = StudentClass::where('class_group_id', $id)
            ->where('student_id', $studentId)
            ->first();

        if (!$membership) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data keanggotaan siswa tidak ditemukan',
            ], 404);
        }

        try {
            $membership->update([
                'status'  => 'keluar',
                'left_at' => today(),
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Siswa berhasil dikeluarkan dari rombel',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error removing student from class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengeluarkan siswa',
            ], 500);
        }
    }

    /**
     * Naik Level Tahfidz (Leveling Dinamis Mingguan).
     * Memindahkan santri dari halaqah saat ini ke halaqah berikutnya saat milestone hafalan tercapai.
     */
    public function promoteTahfidzLevel(Request $request, string $id)
    {
        $currentGroup = ClassGroup::findOrFail($id);

        $validated = $request->validate([
            'student_id'       => 'required|exists:students,id',
            'target_group_id'  => 'required|exists:class_groups,id|different:' . $id,
            'note'             => 'nullable|string',
        ]);

        $membership = StudentClass::where('class_group_id', $currentGroup->id)
            ->where('student_id', $validated['student_id'])
            ->where('status', 'aktif')
            ->first();

        if (!$membership) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Siswa tidak sedang aktif di halaqah ini',
            ], 404);
        }

        $targetGroup = ClassGroup::findOrFail($validated['target_group_id']);

        try {
            DB::beginTransaction();

            $newMembership = $membership->promoteToLevel(
                $targetGroup,
                $validated['note'] ?? "Kenaikan target hafalan ke {$targetGroup->name}"
            );

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Siswa berhasil dinaikkan ke {$targetGroup->name}",
                'data'    => $newMembership->load(['student', 'classGroup']),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error promoting tahfidz level: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menaikkan level tahfidz: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Pasangkan mata pelajaran dan guru pengampu ke rombel ini.
     */
    public function assignSubject(Request $request, string $id)
    {
        $group = ClassGroup::findOrFail($id);

        $validated = $request->validate([
            'study_id'   => 'required|exists:studies,id',
            'teacher_id' => 'nullable|exists:teachers,id',
        ]);

        try {
            $subject = ClassGroupSubject::updateOrCreate(
                [
                    'class_group_id' => $group->id,
                    'study_id'       => $validated['study_id'],
                ],
                [
                    'teacher_id'     => $validated['teacher_id'] ?? null,
                ]
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Mata pelajaran berhasil ditugaskan ke rombel',
                'data'    => $subject->load(['study', 'teacher']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error assigning subject to class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menugaskan mata pelajaran',
            ], 500);
        }
    }
}
