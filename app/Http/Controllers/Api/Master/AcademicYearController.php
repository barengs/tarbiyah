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
    /**
     * Mengambil daftar seluruh tahun akademik beserta sub-akademik triwulannya
     */
    public function index()
    {
        try {
            $years = AcademicYear::with('quarters')
                ->where('type', '!=', 'semester') // Fokus pada kalender triwulan pesantren
                ->orderBy('year', 'desc')
                ->get();

            if ($years->isEmpty()) {
                $years = AcademicYear::with('quarters')->orderBy('year', 'desc')->get();
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Data tahun akademik berhasil diambil',
                'data'    => $years,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving academic years: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data tahun akademik',
            ], 500);
        }
    }

    /**
     * Mengambil tahun akademik aktif beserta triwulan aktifnya
     */
    public function active()
    {
        $year = AcademicYear::with('quarters')
            ->where('active', true)
            ->where('type', 'triwulan')
            ->first();

        if (!$year) {
            $year = AcademicYear::with('quarters')->where('active', true)->first();
        }

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Belum ada tahun akademik yang aktif',
            ], 404);
        }

        $activeQuarter = AcademicQuarter::where('academic_year_id', $year->id)
            ->where('active', true)
            ->first();

        return response()->json([
            'status'  => 'success',
            'message' => 'Tahun akademik aktif berhasil diambil',
            'data'    => [
                'year'           => $year,
                'active_quarter' => $activeQuarter,
                'full_label'     => $activeQuarter ? "Tahun Akademik {$year->year} {$activeQuarter->name}" : "Tahun Akademik {$year->year}",
            ],
        ], 200);
    }

    /**
     * Buat tahun akademik baru dan otomatis generate 4 Sub-Akademik Triwulan Pesantren
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'year'        => 'required|string|max:20|unique:academic_years,year',
            'type'        => 'nullable|string',
            'periode'     => 'nullable|string',
            'start_date'  => 'required|date',
            'end_date'    => 'required|date|after_or_equal:start_date',
            'active'      => 'nullable|boolean',
            'description' => 'nullable|string',
        ]);

        $validated['type'] = 'triwulan';

        try {
            DB::beginTransaction();

            if (!empty($validated['active']) && $validated['active'] == true) {
                AcademicYear::query()->update(['active' => false]);
            }

            $year = AcademicYear::create($validated);

            // Otomatis buat 4 Sub-Akademik Triwulan Pesantren
            $startDate = \Carbon\Carbon::parse($validated['start_date']);
            $endDate = \Carbon\Carbon::parse($validated['end_date']);
            $totalDays = $startDate->diffInDays($endDate);
            $quarterDays = max(80, (int) round($totalDays / 4));

            $triwulanDefinitions = [
                ['name' => 'Triwulan I (Muharram - Rabi\'ul Awwal)', 'idx' => 0],
                ['name' => 'Triwulan II (Rabi\'ul Akhir - Jumadil Akhir)', 'idx' => 1],
                ['name' => 'Triwulan III (Rajab - Ramadhan)', 'idx' => 2],
                ['name' => 'Triwulan IV (Syawal - Dzulhijjah)', 'idx' => 3],
            ];

            foreach ($triwulanDefinitions as $t) {
                $qStart = $startDate->copy()->addDays($t['idx'] * $quarterDays);
                $qEnd = $t['idx'] === 3 ? $endDate : $qStart->copy()->addDays($quarterDays - 1);

                AcademicQuarter::create([
                    'academic_year_id' => $year->id,
                    'name'             => $t['name'],
                    'start_date'       => $qStart,
                    'end_date'         => $qEnd,
                    'active'           => !empty($validated['active']) && $t['idx'] === 0, // Default Triwulan I aktif jika tahun aktif
                ]);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Tahun akademik {$year->year} beserta 4 periode triwulan berhasil dibuat",
                'data'    => $year->load('quarters'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat tahun akademik: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Jadikan tahun akademik aktif
     */
    public function setActive(string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun akademik tidak ditemukan',
            ], 404);
        }

        try {
            DB::beginTransaction();
            AcademicYear::query()->update(['active' => false]);
            $year->update(['active' => true]);

            // Jika belum ada triwulan yang aktif di tahun ini, aktifkan triwulan pertama atau triwulan IV
            $hasActiveQuarter = AcademicQuarter::where('academic_year_id', $year->id)->where('active', true)->exists();
            if (!$hasActiveQuarter) {
                AcademicQuarter::where('academic_year_id', $year->id)->orderBy('id', 'asc')->first()?->update(['active' => true]);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Tahun akademik {$year->year} berhasil diaktifkan",
                'data'    => $year->fresh('quarters'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error activating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengaktifkan tahun akademik',
            ], 500);
        }
    }

    public function show(string $id)
    {
        $year = AcademicYear::with('quarters')->find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun akademik tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail tahun akademik berhasil diambil',
            'data'    => $year,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun akademik tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'year'        => 'sometimes|required|string|max:20|unique:academic_years,year,' . $id,
            'type'        => 'nullable|string',
            'periode'     => 'nullable|string',
            'start_date'  => 'sometimes|required|date',
            'end_date'    => 'sometimes|required|date|after_or_equal:start_date',
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
                'message' => 'Tahun akademik berhasil diperbarui',
                'data'    => $year->fresh('quarters'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui tahun akademik',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $year = AcademicYear::find($id);

        if (!$year) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tahun akademik tidak ditemukan',
            ], 404);
        }

        try {
            DB::beginTransaction();
            // Hapus juga quarters terkait
            AcademicQuarter::where('academic_year_id', $year->id)->delete();
            $year->delete();
            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Tahun akademik beserta periode triwulannya berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting academic year: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus tahun akademik',
            ], 500);
        }
    }
}
