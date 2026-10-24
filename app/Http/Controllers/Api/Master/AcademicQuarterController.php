<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AcademicQuarterController extends Controller
{
    /**
     * Mengambil daftar periode triwulan (sub akademik)
     */
    public function index(Request $request)
    {
        try {
            $query = AcademicQuarter::with('academicYear');

            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->query('academic_year_id'));
            }

            $quarters = $query->orderBy('academic_year_id', 'desc')->orderBy('id', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data periode triwulan berhasil diambil',
                'data'    => $quarters,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving academic quarters: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data periode triwulan',
            ], 500);
        }
    }

    /**
     * Tambah periode triwulan baru
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'name'             => 'required|string|max:100',
            'start_date'       => 'nullable|date',
            'end_date'         => 'nullable|date|after_or_equal:start_date',
            'active'           => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            if (!empty($validated['active']) && $validated['active'] == true) {
                // Nonaktifkan triwulan lain
                AcademicQuarter::query()->update(['active' => false]);
                // Pastikan tahun induknya juga aktif
                AcademicYear::where('id', $validated['academic_year_id'])->update(['active' => true]);
            }

            $quarter = AcademicQuarter::create($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Periode triwulan berhasil ditambahkan',
                'data'    => $quarter->load('academicYear'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating academic quarter: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat periode triwulan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Set satu triwulan menjadi aktif berjalan
     * (sekaligus mengaktifkan tahun akademik induknya)
     */
    public function setActive(string $id)
    {
        $quarter = AcademicQuarter::find($id);

        if (!$quarter) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Periode triwulan tidak ditemukan',
            ], 404);
        }

        try {
            DB::beginTransaction();
            
            // 1. Nonaktifkan semua triwulan
            AcademicQuarter::query()->update(['active' => false]);
            $quarter->update(['active' => true]);

            // 2. Aktifkan tahun akademik induknya
            AcademicYear::where('id', '!=', $quarter->academic_year_id)->update(['active' => false]);
            AcademicYear::where('id', $quarter->academic_year_id)->update(['active' => true]);

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Periode {$quarter->name} berhasil diaktifkan",
                'data'    => $quarter->load('academicYear'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error activating academic quarter: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengaktifkan periode triwulan',
            ], 500);
        }
    }

    /**
     * Update detail periode triwulan
     */
    public function update(Request $request, string $id)
    {
        $quarter = AcademicQuarter::find($id);

        if (!$quarter) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Periode triwulan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'academic_year_id' => 'sometimes|required|exists:academic_years,id',
            'name'             => 'sometimes|required|string|max:100',
            'start_date'       => 'nullable|date',
            'end_date'         => 'nullable|date|after_or_equal:start_date',
            'active'           => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            if (!empty($validated['active']) && $validated['active'] == true) {
                AcademicQuarter::where('id', '!=', $id)->update(['active' => false]);
                $targetYearId = $validated['academic_year_id'] ?? $quarter->academic_year_id;
                AcademicYear::where('id', $targetYearId)->update(['active' => true]);
            }

            $quarter->update($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Periode triwulan berhasil diperbarui',
                'data'    => $quarter->fresh('academicYear'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating academic quarter: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui periode triwulan',
            ], 500);
        }
    }

    /**
     * Hapus periode triwulan
     */
    public function destroy(string $id)
    {
        $quarter = AcademicQuarter::find($id);

        if (!$quarter) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Periode triwulan tidak ditemukan',
            ], 404);
        }

        try {
            $quarter->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Periode triwulan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting academic quarter: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus periode triwulan',
            ], 500);
        }
    }
}
