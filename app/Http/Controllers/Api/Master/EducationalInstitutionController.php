<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\EducationalInstitution;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class EducationalInstitutionController extends Controller
{
    public function index()
    {
        try {
            $query = EducationalInstitution::with(['educationType', 'educations', 'classrooms', 'classes']);

            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            if ($userProgramId) {
                $query->whereHas('educations', function ($q) use ($userProgramId) {
                    $q->where('program_id', $userProgramId);
                });
            }

            $institutions = $query->get();
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
            'progression_type'     => 'required|in:triwulan,semester,leveling',
            'address'              => 'nullable|string',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email|max:255',
            'website'              => 'nullable|string|max:255',
            'status'               => 'nullable|in:active,inactive',
            'description'          => 'nullable|string',
            'headmaster_id'        => 'nullable|integer',
            'headmaster_name'      => 'nullable|string|max:255',
            'logo'                 => 'nullable',
            'letterhead'           => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            if ($request->hasFile('logo')) {
                $request->validate(['logo' => 'image|mimes:jpeg,png,jpg,webp,svg|max:2048']);
                $validated['logo'] = $request->file('logo')->store('institutions/logos', 'public');
            } else {
                unset($validated['logo']);
            }

            if ($request->hasFile('letterhead')) {
                $request->validate(['letterhead' => 'image|mimes:jpeg,png,jpg,webp,svg|max:4096']);
                $validated['letterhead'] = $request->file('letterhead')->store('institutions/letterheads', 'public');
            } else {
                unset($validated['letterhead']);
            }

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
        $institution = EducationalInstitution::with(['educationType', 'educations', 'classrooms', 'classes'])->find($id);

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
            'progression_type'     => 'sometimes|required|in:triwulan,semester,leveling',
            'address'              => 'nullable|string',
            'phone'                => 'nullable|string|max:30',
            'email'                => 'nullable|email|max:255',
            'website'              => 'nullable|string|max:255',
            'status'               => 'nullable|in:active,inactive',
            'description'          => 'nullable|string',
            'headmaster_id'        => 'nullable|integer',
            'headmaster_name'      => 'nullable|string|max:255',
            'logo'                 => 'nullable',
            'letterhead'           => 'nullable',
            'remove_logo'          => 'nullable|boolean',
            'remove_letterhead'    => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            // Handle upload / hapus logo
            if ($request->hasFile('logo')) {
                $request->validate(['logo' => 'image|mimes:jpeg,png,jpg,webp,svg|max:2048']);
                if ($institution->logo && Storage::disk('public')->exists($institution->logo)) {
                    Storage::disk('public')->delete($institution->logo);
                }
                $validated['logo'] = $request->file('logo')->store('institutions/logos', 'public');
            } elseif ($request->boolean('remove_logo')) {
                if ($institution->logo && Storage::disk('public')->exists($institution->logo)) {
                    Storage::disk('public')->delete($institution->logo);
                }
                $validated['logo'] = null;
            } else {
                unset($validated['logo']);
            }

            // Handle upload / hapus letterhead (kop surat)
            if ($request->hasFile('letterhead')) {
                $request->validate(['letterhead' => 'image|mimes:jpeg,png,jpg,webp,svg|max:4096']);
                if ($institution->letterhead && Storage::disk('public')->exists($institution->letterhead)) {
                    Storage::disk('public')->delete($institution->letterhead);
                }
                $validated['letterhead'] = $request->file('letterhead')->store('institutions/letterheads', 'public');
            } elseif ($request->boolean('remove_letterhead')) {
                if ($institution->letterhead && Storage::disk('public')->exists($institution->letterhead)) {
                    Storage::disk('public')->delete($institution->letterhead);
                }
                $validated['letterhead'] = null;
            } else {
                unset($validated['letterhead']);
            }

            unset($validated['remove_logo'], $validated['remove_letterhead']);

            $institution->update($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Institusi pendidikan berhasil diperbarui',
                'data'    => $institution->fresh(['educationType', 'educations', 'classrooms']),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating institution: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui institusi: ' . $e->getMessage(),
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
