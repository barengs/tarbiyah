<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\AcademicQuarter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AcademicYearController extends Controller
{
    public function index()
    {
        try {
            $years = AcademicYear::with('quarters')->orderBy('year', 'desc')->get();
            return response()->json([
                'status'  => 'success',
                'message' => 'Data tahun ajaran berhasil diambil',
                'data'    => $years,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving academic years: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data tahun ajaran',
            ], 500);
        }
    }

    public function active()
    {
        $year = AcademicYear::with('quarters')->where('active', true)->first();

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Belum ada tahun ajaran yang aktif',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Tahun ajaran aktif berhasil diambil',
            'data'    => $year,
        ], 200);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'year'        => 'required|string|max:9|unique:academic_years,year',
            'type'        => 'nullable|in:semester,triwulan,custom',
            'periode'     => 'nullable|in:ganjil,genap,pendek',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after:start_date',
            'active'      => 'nullable|boolean',
            'description' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            if (!empty($validated['active']) && $validated['active'] == true) {
                AcademicYear::query()->update(['active' => false]);
            }

            $year = AcademicYear::create($validated);

            // Auto-create quarters if type is semester
            if (($validated['type'] ?? 'semester') === 'semester') {
                $startDate = \Carbon\Carbon::parse($validated['start_date']);
                $endDate = \Carbon\Carbon::parse($validated['end_date']);
                $midDate = $startDate->copy()->addMonths(6);

                AcademicQuarter::create([
                    'academic_year_id' => $year->id,
                    'name'             => 'Semester Ganjil',
                    'start_date'       => $startDate,
                    'end_date'         => $midDate,
                    'active'           => true,
                ]);

                AcademicQuarter::create([
                    'academic_year_id' => $year->id,
                    'name'             => 'Semester Genap',
                    'start_date'       => $midDate->copy()->addDay(),
                    'end_date'         => $endDate,
                    'active'           => false,
                ]);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Tahun ajaran berhasil dibuat beserta semesternya',
                'data'    => $year->load('quarters'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat tahun ajaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function setActive(string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun ajaran tidak ditemukan',
            ], 404);
        }

        try {
            DB::beginTransaction();
            AcademicYear::query()->update(['active' => false]);
            $year->update(['active' => true]);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Tahun ajaran {$year->year} berhasil diaktifkan",
                'data'    => $year->fresh('quarters'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error activating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengaktifkan tahun ajaran',
            ], 500);
        }
    }

    public function show(string $id)
    {
        $year = AcademicYear::with('quarters')->find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun ajaran tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail tahun ajaran berhasil diambil',
            'data'    => $year,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun ajaran tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'year'        => 'sometimes|required|string|max:9|unique:academic_years,year,' . $id,
            'type'        => 'nullable|in:semester,triwulan,custom',
            'periode'     => 'nullable|in:ganjil,genap,pendek',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'sometimes|required|date|after:start_date',
            'active'      => 'nullable|boolean',
            'description' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();
            if (!empty($validated['active']) && $validated['active'] == true) {
                AcademicYear::where('id', '!=', $id)->update(['active' => false]);
            }
            $year->update($validated);
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Tahun ajaran berhasil diperbarui',
                'data'    => $year->fresh('quarters'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui tahun ajaran',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun ajaran tidak ditemukan',
            ], 404);
        }

        try {
            $year->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Tahun ajaran berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus tahun ajaran',
            ], 500);
        }
    }
}
