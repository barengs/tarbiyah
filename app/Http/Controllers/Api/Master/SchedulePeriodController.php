<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\LessonSchedule;
use App\Models\SchedulePeriod;
use App\Models\TeachingJournal;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SchedulePeriodController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:kbm.create', only: ['store']),
            new Middleware('permission:kbm.update', only: ['update', 'activate', 'deactivate', 'reset']),
            new Middleware('permission:kbm.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $query = SchedulePeriod::with(['academicYear', 'academicQuarter', 'creator'])
                ->withCount('schedules');

            $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
            if ($targetYearId) {
                $query->where('academic_year_id', $targetYearId);
            }

            $targetQuarterId = $request->query('academic_quarter_id') ?: $request->header('X-Academic-Quarter-Id');
            if ($targetQuarterId) {
                $query->where(function ($q) use ($targetQuarterId) {
                    $q->where('academic_quarter_id', $targetQuarterId)
                        ->orWhereNull('academic_quarter_id');
                });
            }

            if ($request->has('is_active') && $request->query('is_active') !== '') {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            $periods = $query->orderByDesc('is_active')
                ->orderByDesc('id')
                ->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data periode jadwal berhasil diambil',
                'data' => $periods,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving schedule periods: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data periode jadwal',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150',
            'academic_year_id' => 'required|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'description' => 'nullable|string|max:500',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'is_active' => 'nullable|boolean',
        ]);

        if (! empty($validated['academic_quarter_id'])) {
            $quarterValid = AcademicQuarter::where('id', $validated['academic_quarter_id'])
                ->where('academic_year_id', $validated['academic_year_id'])
                ->exists();

            if (! $quarterValid) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Periode caturwulan tidak sesuai dengan tahun akademik yang dipilih.',
                ], 422);
            }
        }

        $activateNow = (bool) ($validated['is_active'] ?? false);

        if ($activateNow && ! empty($validated['effective_end_date']) && $validated['effective_end_date'] < now()->toDateString()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tanggal berakhir masa berlaku sudah lewat, tidak dapat langsung diaktifkan.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            if ($activateNow) {
                $this->deactivateSiblingPeriods(
                    (int) $validated['academic_year_id'],
                    isset($validated['academic_quarter_id']) ? (int) $validated['academic_quarter_id'] : null
                );
            }

            $period = SchedulePeriod::create([
                'name' => trim($validated['name']),
                'academic_year_id' => $validated['academic_year_id'],
                'academic_quarter_id' => $validated['academic_quarter_id'] ?? null,
                'description' => $validated['description'] ?? null,
                'effective_start_date' => $validated['effective_start_date'] ?? null,
                'effective_end_date' => $validated['effective_end_date'] ?? null,
                'is_active' => $activateNow,
                'activated_at' => $activateNow ? now() : null,
                'created_by' => auth('api')->id(),
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => $activateNow
                    ? 'Jadwal baru berhasil dibuat dan langsung diberlakukan'
                    : 'Jadwal baru berhasil dibuat sebagai draft (belum berlaku)',
                'data' => $period->load(['academicYear', 'academicQuarter', 'creator'])->loadCount('schedules'),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat periode jadwal: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $period = SchedulePeriod::with(['academicYear', 'academicQuarter', 'creator'])
            ->withCount('schedules')
            ->find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail periode jadwal berhasil diambil',
            'data' => $period,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $period = SchedulePeriod::find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:150',
            'academic_year_id' => 'sometimes|required|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'description' => 'nullable|string|max:500',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date',
        ]);

        $targetYearId = (int) ($validated['academic_year_id'] ?? $period->academic_year_id);
        $targetQuarterId = array_key_exists('academic_quarter_id', $validated)
            ? $validated['academic_quarter_id']
            : $period->academic_quarter_id;

        if ($targetQuarterId) {
            $quarterValid = AcademicQuarter::where('id', $targetQuarterId)
                ->where('academic_year_id', $targetYearId)
                ->exists();

            if (! $quarterValid) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Periode caturwulan tidak sesuai dengan tahun akademik yang dipilih.',
                ], 422);
            }
        }

        $startDate = array_key_exists('effective_start_date', $validated)
            ? $validated['effective_start_date']
            : $period->effective_start_date?->toDateString();
        $endDate = array_key_exists('effective_end_date', $validated)
            ? $validated['effective_end_date']
            : $period->effective_end_date?->toDateString();

        if ($startDate && $endDate && $endDate < $startDate) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tanggal berakhir masa berlaku tidak boleh lebih awal dari tanggal mulai berlaku.',
            ], 422);
        }

        DB::beginTransaction();
        try {
            if (isset($validated['name'])) {
                $validated['name'] = trim($validated['name']);
            }

            $period->update($validated);

            // Sinkronkan tahun/caturwulan pada slot jadwal anak jika berubah
            if ($period->wasChanged(['academic_year_id', 'academic_quarter_id'])) {
                LessonSchedule::where('schedule_period_id', $period->id)->update([
                    'academic_year_id' => $period->academic_year_id,
                    'academic_quarter_id' => $period->academic_quarter_id,
                ]);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Informasi dan masa berlaku jadwal berhasil diperbarui',
                'data' => $period->fresh(['academicYear', 'academicQuarter', 'creator'])->loadCount('schedules'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui periode jadwal: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Aktifkan / berlakukan periode jadwal ini.
     * Otomatis menonaktifkan periode jadwal lain pada tahun & caturwulan yang sama.
     */
    public function activate(string $id)
    {
        $period = SchedulePeriod::find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        if ($period->effective_end_date && $period->effective_end_date->toDateString() < now()->toDateString()) {
            return response()->json([
                'status' => 'error',
                'message' => "Masa berlaku jadwal \"{$period->name}\" sudah berakhir pada {$period->effective_end_date->format('d/m/Y')}. Perbarui tanggal masa berlaku terlebih dahulu sebelum mengaktifkan.",
            ], 422);
        }

        DB::beginTransaction();
        try {
            $this->deactivateSiblingPeriods(
                (int) $period->academic_year_id,
                $period->academic_quarter_id ? (int) $period->academic_quarter_id : null,
                (int) $period->id
            );

            $period->update([
                'is_active' => true,
                'activated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Jadwal \"{$period->name}\" berhasil diaktifkan dan mulai berlaku.",
                'data' => $period->fresh(['academicYear', 'academicQuarter', 'creator'])->loadCount('schedules'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error activating schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengaktifkan jadwal: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Nonaktifkan periode jadwal (kembalikan ke status belum berlaku).
     */
    public function deactivate(string $id)
    {
        $period = SchedulePeriod::find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        try {
            $period->update(['is_active' => false]);

            return response()->json([
                'status' => 'success',
                'message' => "Jadwal \"{$period->name}\" berhasil dinonaktifkan.",
                'data' => $period->fresh(['academicYear', 'academicQuarter', 'creator'])->loadCount('schedules'),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deactivating schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menonaktifkan jadwal',
            ], 500);
        }
    }

    /**
     * Reset seluruh isi slot jadwal sebelum jadwal diberlakukan (hanya untuk jadwal berstatus belum aktif).
     */
    public function reset(Request $request, string $id)
    {
        $period = SchedulePeriod::find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        if ($period->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => "Jadwal \"{$period->name}\" sudah diberlakukan (berstatus aktif) dan tidak dapat direset. Nonaktifkan terlebih dahulu atau buat periode jadwal baru.",
            ], 422);
        }

        $validated = $request->validate([
            'class_group_id' => 'nullable|exists:class_groups,id',
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
        ]);

        $scopeQuery = LessonSchedule::withTrashed()->where('schedule_period_id', $period->id);

        if (! empty($validated['class_group_id'])) {
            $scopeQuery->where('class_group_id', $validated['class_group_id']);
        } elseif (! empty($validated['educational_institution_id'])) {
            $instId = $validated['educational_institution_id'];
            $scopeQuery->whereHas('classGroup', function ($q) use ($instId) {
                $q->where('educational_institution_id', $instId)
                    ->orWhere('education_id', $instId);
            });
        }

        $targetScheduleIds = (clone $scopeQuery)->pluck('id');

        if ($targetScheduleIds->isNotEmpty()) {
            $hasJournals = TeachingJournal::whereIn('lesson_schedule_id', $targetScheduleIds)->exists();
            if ($hasJournals) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Jadwal \"{$period->name}\" sudah memiliki riwayat jurnal KBM / presensi sehingga tidak dapat direset.",
                ], 422);
            }
        }

        DB::beginTransaction();
        try {
            $activeCount = LessonSchedule::where('schedule_period_id', $period->id)
                ->when(! empty($validated['class_group_id']), fn ($q) => $q->where('class_group_id', $validated['class_group_id']))
                ->when(
                    empty($validated['class_group_id']) && ! empty($validated['educational_institution_id']),
                    fn ($q) => $q->whereHas('classGroup', function ($cg) use ($validated) {
                        $cg->where('educational_institution_id', $validated['educational_institution_id'])
                            ->orWhere('education_id', $validated['educational_institution_id']);
                    })
                )
                ->count();

            $scopeQuery->forceDelete();

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => $activeCount > 0
                    ? "Berhasil mereset {$activeCount} sesi jadwal pada \"{$period->name}\"."
                    : "Jadwal \"{$period->name}\" sudah kosong (0 sesi dihapus).",
                'data' => [
                    'deleted_count' => $activeCount,
                    'schedule_period' => $period->fresh(['academicYear', 'academicQuarter', 'creator'])->loadCount('schedules'),
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error resetting schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mereset jadwal: '.$e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $period = SchedulePeriod::find($id);

        if (! $period) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode jadwal tidak ditemukan',
            ], 404);
        }

        if ($period->is_active) {
            return response()->json([
                'status' => 'error',
                'message' => "Jadwal \"{$period->name}\" sedang aktif/berlaku dan tidak dapat dihapus. Nonaktifkan terlebih dahulu.",
            ], 422);
        }

        try {
            $period->delete();

            return response()->json([
                'status' => 'success',
                'message' => "Periode jadwal \"{$period->name}\" berhasil dihapus.",
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting schedule period: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus periode jadwal',
            ], 500);
        }
    }

    /**
     * Nonaktifkan periode jadwal lain dalam tahun & caturwulan yang sama.
     */
    private function deactivateSiblingPeriods(int $academicYearId, ?int $academicQuarterId, ?int $exceptId = null): void
    {
        $query = SchedulePeriod::where('academic_year_id', $academicYearId)
            ->where('is_active', true);

        if ($academicQuarterId) {
            $query->where('academic_quarter_id', $academicQuarterId);
        } else {
            $query->whereNull('academic_quarter_id');
        }

        if ($exceptId) {
            $query->where('id', '!=', $exceptId);
        }

        $query->update(['is_active' => false]);
    }
}
