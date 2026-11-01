<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Study;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class StudyController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Study::with(['educationalInstitution', 'teachers'])
                ->where('name', 'not like', '%Tahfidz%')
                ->where('name', 'not like', '%Tahfizh%');

            if ($request->filled('educational_institution_id')) {
                $instId = $request->query('educational_institution_id');
                $query->where(function ($q) use ($instId) {
                    $q->where('educational_institution_id', $instId)
                      ->orWhereNull('educational_institution_id');
                });
            }

            if ($request->filled('study_type') && $request->query('study_type') !== 'all') {
                $query->where('study_type', $request->query('study_type'));
            }

            // Jika dipanggil untuk jadwal pelajaran KBM, kecualikan mapel muatan_lokal (non-kelas)
            if ($request->boolean('for_schedule')) {
                $query->whereIn('study_type', ['reguler', 'khusus']);
            }

            if ($request->has('is_active') && $request->query('is_active') !== '') {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('code', 'like', "%{$search}%");
                });
            }

            $studies = $query->orderByRaw("FIELD(study_type, 'khusus', 'reguler', 'muatan_lokal')")
                ->orderBy('order', 'asc')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data mata pelajaran berhasil diambil',
                'data'    => $studies,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving studies: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data mata pelajaran',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'code'                       => 'nullable|string|max:20',
            'name'                       => 'required|string|max:255',
            'study_type'                 => 'nullable|in:reguler,khusus,muatan_lokal',
            'kkm'                        => 'nullable|numeric|min:0|max:100',
            'order'                      => 'nullable|integer',
            'description'                => 'nullable|string',
            'is_active'                  => 'nullable|boolean',
            'teacher_ids'                => 'nullable|array',
            'teacher_ids.*'              => 'exists:teachers,id',
        ]);

        try {
            DB::beginTransaction();

            $study = Study::create([
                'educational_institution_id' => $validated['educational_institution_id'] ?? null,
                'code'                       => $validated['code'] ?? null,
                'name'                       => $validated['name'],
                'study_type'                 => $validated['study_type'] ?? 'reguler',
                'kkm'                        => $validated['kkm'] ?? 75.00,
                'order'                      => $validated['order'] ?? 1,
                'description'                => $validated['description'] ?? null,
                'is_active'                  => $validated['is_active'] ?? true,
            ]);

            if (!empty($validated['teacher_ids'])) {
                $study->teachers()->sync($validated['teacher_ids']);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Mata pelajaran berhasil ditambahkan',
                'data'    => $study->load(['educationalInstitution', 'teachers']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating study: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan mata pelajaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $study = Study::with(['educationalInstitution', 'teachers'])->find($id);

        if (!$study) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail mata pelajaran berhasil diambil',
            'data'    => $study,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $study = Study::find($id);

        if (!$study) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'code'                       => 'nullable|string|max:20',
            'name'                       => 'sometimes|required|string|max:255',
            'study_type'                 => 'sometimes|required|in:reguler,khusus,muatan_lokal',
            'kkm'                        => 'nullable|numeric|min:0|max:100',
            'order'                      => 'nullable|integer',
            'description'                => 'nullable|string',
            'is_active'                  => 'nullable|boolean',
            'teacher_ids'                => 'nullable|array',
            'teacher_ids.*'              => 'exists:teachers,id',
        ]);

        try {
            DB::beginTransaction();

            $study->update($validated);

            if (isset($validated['teacher_ids'])) {
                $study->teachers()->sync($validated['teacher_ids']);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Mata pelajaran berhasil diperbarui',
                'data'    => $study->fresh(['educationalInstitution', 'teachers']),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating study: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui mata pelajaran',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $study = Study::find($id);

        if (!$study) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        try {
            $study->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Mata pelajaran berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting study: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus mata pelajaran',
            ], 500);
        }
    }
}
