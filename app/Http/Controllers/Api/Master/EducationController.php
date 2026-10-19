<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Education;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class EducationController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Education::with('institution');

            if ($request->has('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            $educations = $query->orderBy('level', 'asc')->get();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data jenjang pendidikan berhasil diambil',
                'data'    => $educations,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving educations: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data jenjang pendidikan',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'educational_institution_id' => 'required|exists:educational_institutions,id',
            'name'                       => 'required|string|max:255',
            'level'                      => 'required|integer|min:1',
            'description'                => 'nullable|string',
        ]);

        try {
            $education = Education::create($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Jenjang pendidikan berhasil ditambahkan',
                'data'    => $education,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating education: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan jenjang pendidikan',
            ], 500);
        }
    }

    public function show(string $id)
    {
        $education = Education::with('institution')->find($id);

        if (!$education) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jenjang pendidikan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail jenjang pendidikan berhasil diambil',
            'data'    => $education,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $education = Education::find($id);

        if (!$education) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jenjang pendidikan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'educational_institution_id' => 'sometimes|required|exists:educational_institutions,id',
            'name'                       => 'sometimes|required|string|max:255',
            'level'                      => 'sometimes|required|integer|min:1',
            'description'                => 'nullable|string',
        ]);

        try {
            $education->update($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Jenjang pendidikan berhasil diperbarui',
                'data'    => $education,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating education: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui jenjang pendidikan',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $education = Education::find($id);

        if (!$education) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jenjang pendidikan tidak ditemukan',
            ], 404);
        }

        try {
            $education->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Jenjang pendidikan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting education: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus jenjang pendidikan',
            ], 500);
        }
    }
}
