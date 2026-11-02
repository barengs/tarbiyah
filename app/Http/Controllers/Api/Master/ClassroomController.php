<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Classroom;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class ClassroomController extends Controller
{
    /**
     * Tampilkan daftar ruang kelas fisik (Gedung, Lab, Ruang Belajar).
     */
    public function index(Request $request)
    {
        try {
            $query = Classroom::with(['educationalInstitution'])
                ->withCount(['classGroups', 'schedules']);

            if ($request->filled('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            }

            $classrooms = $query->orderBy('name', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data ruang kelas berhasil diambil',
                'data'    => $classrooms,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching classrooms: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data ruang kelas',
            ], 500);
        }
    }

    /**
     * Tambahkan ruang kelas baru.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name'                       => 'required|string|max:255',
            'capacity'                   => 'nullable|integer|min:1',
            'description'                => 'nullable|string',
        ]);

        try {
            $classroom = Classroom::create([
                'educational_institution_id' => $validated['educational_institution_id'] ?? null,
                'name'                       => $validated['name'],
                'capacity'                   => $validated['capacity'] ?? 30,
                'description'                => $validated['description'] ?? null,
            ]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Ruang kelas berhasil ditambahkan',
                'data'    => $classroom->load('educationalInstitution'),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating classroom: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menambahkan ruang kelas: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Tampilkan detail ruang kelas.
     */
    public function show(string $id)
    {
        $classroom = Classroom::with(['educationalInstitution', 'classGroups', 'schedules.study', 'schedules.teacher'])
            ->withCount(['classGroups', 'schedules'])
            ->find($id);

        if (!$classroom) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ruang kelas tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail ruang kelas berhasil diambil',
            'data'    => $classroom,
        ], 200);
    }

    /**
     * Perbarui data ruang kelas.
     */
    public function update(Request $request, string $id)
    {
        $classroom = Classroom::find($id);

        if (!$classroom) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ruang kelas tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'name'                       => 'sometimes|required|string|max:255',
            'capacity'                   => 'nullable|integer|min:1',
            'description'                => 'nullable|string',
        ]);

        try {
            $classroom->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Ruang kelas berhasil diperbarui',
                'data'    => $classroom->fresh('educationalInstitution'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating classroom: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui ruang kelas',
            ], 500);
        }
    }

    /**
     * Hapus ruang kelas.
     */
    public function destroy(string $id)
    {
        $classroom = Classroom::withCount(['classGroups', 'schedules'])->find($id);

        if (!$classroom) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Ruang kelas tidak ditemukan',
            ], 404);
        }

        if ($classroom->class_groups_count > 0 || $classroom->schedules_count > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Ruang kelas tidak dapat dihapus karena masih digunakan dalam {$classroom->class_groups_count} rombel atau {$classroom->schedules_count} jadwal KBM.",
            ], 422);
        }

        try {
            $classroom->delete();

            return response()->json([
                'status'  => 'success',
                'message' => 'Ruang kelas berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting classroom: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus ruang kelas',
            ], 500);
        }
    }
}

