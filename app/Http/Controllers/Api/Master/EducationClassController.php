<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\EducationClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EducationClassController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = EducationClass::with(['education.institution', 'classGroups']);

            if ($request->has('education_id') && $request->query('education_id')) {
                $query->where('education_id', $request->query('education_id'));
            }

            if ($request->has('educational_institution_id') && $request->query('educational_institution_id')) {
                $instId = $request->query('educational_institution_id');
                $query->whereHas('education', function ($q) use ($instId) {
                    $q->where('educational_institution_id', $instId);
                });
            }

            $classes = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data kelas pendidikan berhasil diambil',
                'data'    => $classes,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving education classes: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data kelas pendidikan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'education_id' => 'nullable|exists:educations,id',
            'code'         => 'required|string|max:50|unique:education_classes,code',
            'name'         => 'required|string|max:100',
        ]);

        try {
            $class = EducationClass::create($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Kelas pendidikan berhasil ditambahkan',
                'data'    => $class->load('education.institution'),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating education class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan kelas pendidikan',
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        $class = EducationClass::with(['education.institution', 'classGroups'])->find($id);

        if (!$class) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kelas pendidikan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail kelas pendidikan berhasil diambil',
            'data'    => $class,
        ], 200);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $class = EducationClass::find($id);

        if (!$class) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kelas pendidikan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'education_id' => 'nullable|exists:educations,id',
            'code'         => 'sometimes|required|string|max:50|unique:education_classes,code,' . $id,
            'name'         => 'sometimes|required|string|max:100',
        ]);

        try {
            $class->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Kelas pendidikan berhasil diperbarui',
                'data'    => $class->fresh('education.institution'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating education class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui kelas pendidikan',
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $class = EducationClass::find($id);

        if (!$class) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Kelas pendidikan tidak ditemukan',
            ], 404);
        }

        try {
            $class->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Kelas pendidikan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting education class: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus kelas pendidikan',
            ], 500);
        }
    }
}
