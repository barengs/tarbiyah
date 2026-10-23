<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class StudentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = Student::query();

            // Filter tipe siswa: mukim (santri) vs luar (reguler kalong)
            if ($request->has('is_mukim') && $request->query('is_mukim') !== '' && $request->query('is_mukim') !== 'all') {
                $val = filter_var($request->query('is_mukim'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
                if ($val !== null) {
                    $query->where('is_mukim', $val);
                }
            }

            if ($request->has('status')) {
                $query->where('status', $request->query('status'));
            }

            if ($request->has('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('nis', 'like', "%{$search}%")
                      ->orWhere('nisn', 'like', "%{$search}%");
                });
            }

            $students = $query->orderBy('name', 'asc')->paginate($request->query('per_page', 20));

            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil diambil',
                'data'    => $students->items(),
                'meta'    => [
                    'current_page' => $students->currentPage(),
                    'last_page'    => $students->lastPage(),
                    'per_page'     => $students->perPage(),
                    'total'        => $students->total(),
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving students: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data siswa',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nis'          => 'required|string|max:50|unique:students,nis',
            'nisn'         => 'nullable|string|max:50',
            'nik'          => 'nullable|string|max:30',
            'name'         => 'required|string|max:255',
            'gender'       => 'required|in:L,P',
            'is_mukim'     => 'required|boolean', // false untuk siswa reguler luar
            'santri_id'    => 'nullable|integer',
            'born_in'      => 'nullable|string|max:255',
            'born_at'      => 'nullable|date',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
            'status'       => 'nullable|in:aktif,lulus,mutasi,keluar',
        ]);

        try {
            $student = Student::create($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Siswa berhasil didaftarkan',
                'data'    => $student,
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mendaftarkan siswa: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail siswa berhasil diambil',
            'data'    => $student,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'nis'          => 'sometimes|required|string|max:50|unique:students,nis,' . $id,
            'nisn'         => 'nullable|string|max:50',
            'nik'          => 'nullable|string|max:30',
            'name'         => 'sometimes|required|string|max:255',
            'gender'       => 'sometimes|required|in:L,P',
            'is_mukim'     => 'sometimes|required|boolean',
            'born_in'      => 'nullable|string|max:255',
            'born_at'      => 'nullable|date',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
            'status'       => 'nullable|in:aktif,lulus,mutasi,keluar',
        ]);

        try {
            $student->update($validated);
            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil diperbarui',
                'data'    => $student,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui data siswa',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $student = Student::find($id);

        if (!$student) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Data siswa tidak ditemukan',
            ], 404);
        }

        try {
            $student->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data siswa berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting student: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus data siswa',
            ], 500);
        }
    }
}
