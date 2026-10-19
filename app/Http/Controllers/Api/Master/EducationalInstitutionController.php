<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\EducationalInstitution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class EducationalInstitutionController extends Controller
{
    public function index()
    {
        try {
            $institutions = EducationalInstitution::with(['educationType', 'educations', 'classrooms'])->get();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data institusi pendidikan berhasil diambil',
                'data'    => $institutions,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving institutions: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data institusi pendidikan',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                 => 'required|string|max:255',
            'short_name'           => 'nullable|string|max:30',
            'education_type_id'    => 'nullable|exists:education_types,id',
            'registration_number'  => 'nullable|string|unique:educational_institutions,registration_number',
            'progression_type'     => 'required|in:semester,leveling',
            'address'              => 'nullable|string',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email|max:255',
            'website'              => 'nullable|string|max:255',
            'status'               => 'nullable|in:active,inactive',
            'description'          => 'nullable|string',
            'headmaster_id'        => 'nullable|integer',
            'headmaster_name'      => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();
            $institution = EducationalInstitution::create($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Institusi pendidikan berhasil ditambahkan',
                'data'    => $institution,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating institution: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan institusi: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $institution = EducationalInstitution::with(['educationType', 'educations', 'classrooms'])->find($id);

        if (!$institution) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail institusi pendidikan berhasil diambil',
            'data'    => $institution,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $institution = EducationalInstitution::find($id);

        if (!$institution) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'name'                 => 'sometimes|required|string|max:255',
            'short_name'           => 'nullable|string|max:30',
            'education_type_id'    => 'nullable|exists:education_types,id',
            'registration_number'  => 'nullable|string|unique:educational_institutions,registration_number,' . $id,
            'progression_type'     => 'sometimes|required|in:semester,leveling',
            'address'              => 'nullable|string',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email|max:255',
            'website'              => 'nullable|string|max:255',
            'status'               => 'nullable|in:active,inactive',
            'description'          => 'nullable|string',
            'headmaster_id'        => 'nullable|integer',
            'headmaster_name'      => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();
            $institution->update($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Institusi pendidikan berhasil diperbarui',
                'data'    => $institution,
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating institution: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui institusi',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $institution = EducationalInstitution::find($id);

        if (!$institution) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        try {
            $institution->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Institusi pendidikan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting institution: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus institusi',
            ], 500);
        }
    }
}
