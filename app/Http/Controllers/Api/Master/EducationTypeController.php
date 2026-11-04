<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\EducationType;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\Log;

class EducationTypeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:jenjang.create', only: ['store']),
            new Middleware('permission:jenjang.update', only: ['update']),
            new Middleware('permission:jenjang.delete', only: ['destroy']),
        ];
    }

    /**
     * Tampilkan daftar kelompok pendidikan (Formal, Nonformal, Diniyah, dll).
     */
    public function index(Request $request)
    {
        try {
            $query = EducationType::withCount('institutions');

            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            }

            $types = $query->orderBy('id', 'asc')->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data kelompok pendidikan berhasil diambil',
                'data' => $types,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching education types: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data kelompok pendidikan',
            ], 500);
        }
    }

    /**
     * Tambahkan kelompok pendidikan baru.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:education_types,name',
            'description' => 'nullable|string',
        ]);

        try {
            $type = EducationType::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Kelompok pendidikan berhasil ditambahkan',
                'data' => $type->loadCount('institutions'),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating education type: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambahkan kelompok pendidikan: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Tampilkan detail kelompok pendidikan.
     */
    public function show(string $id)
    {
        $type = EducationType::with(['institutions'])->withCount('institutions')->find($id);

        if (! $type) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kelompok pendidikan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail kelompok pendidikan berhasil diambil',
            'data' => $type,
        ], 200);
    }

    /**
     * Perbarui data kelompok pendidikan.
     */
    public function update(Request $request, string $id)
    {
        $type = EducationType::find($id);

        if (! $type) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kelompok pendidikan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255|unique:education_types,name,'.$id,
            'description' => 'nullable|string',
        ]);

        try {
            $type->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Kelompok pendidikan berhasil diperbarui',
                'data' => $type->fresh()->loadCount('institutions'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating education type: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui kelompok pendidikan',
            ], 500);
        }
    }

    /**
     * Hapus kelompok pendidikan.
     */
    public function destroy(string $id)
    {
        $type = EducationType::withCount('institutions')->find($id);

        if (! $type) {
            return response()->json([
                'status' => 'error',
                'message' => 'Kelompok pendidikan tidak ditemukan',
            ], 404);
        }

        if ($type->institutions_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Tidak dapat menghapus kelompok pendidikan ini karena masih digunakan oleh {$type->institutions_count} institusi.",
            ], 422);
        }

        try {
            $type->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Kelompok pendidikan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting education type: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus kelompok pendidikan',
            ], 500);
        }
    }
}
