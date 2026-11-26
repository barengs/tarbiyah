<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\Education;
use App\Models\LessonSchedule;
use App\Models\SchedulePeriod;
use App\Models\Study;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LessonScheduleController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:kbm.create', only: ['store', 'copyPeriod', 'copyAcademicYear']),
            new Middleware('permission:kbm.update', only: ['update']),
            new Middleware('permission:kbm.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            $query = LessonSchedule::with([
                'academicYear',
                'academicQuarter',
                'schedulePeriod',
                'classGroup.program',
                'classGroup.educationalInstitution',
                'classGroup.education',
                'classGroup.educationClass',
                'study',
                'teacher',
                'lessonHour',
                'classroom',
            ]);

            if ($userProgramId) {
                $query->whereHas('classGroup', fn ($cg) => $cg->where('program_id', $userProgramId));
            }

            $schedulePeriodId = $request->query('schedule_period_id');
            if ($schedulePeriodId) {
                $query->where('lesson_schedules.schedule_period_id', $schedulePeriodId);
            } else {
                $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
                if ($targetYearId) {
                    $query->where('lesson_schedules.academic_year_id', $targetYearId);
                }

                $targetQuarterId = $request->query('academic_quarter_id') ?: $request->header('X-Academic-Quarter-Id');
                if ($targetQuarterId) {
                    $query->where(function ($q) use ($targetQuarterId) {
                        $q->where('lesson_schedules.academic_quarter_id', $targetQuarterId)
                            ->orWhereNull('lesson_schedules.academic_quarter_id');
                    });
                }

                // Tanpa schedule_period_id spesifik, hanya tampilkan jadwal yang aktif & sedang berlaku kecuali diminta semua
                if (! $request->boolean('all_periods')) {
                    $query->fromActivePeriod();
                }
            }

            if ($request->has('class_group_id') && $request->query('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->has('teacher_id') && $request->query('teacher_id')) {
                $query->where('teacher_id', $request->query('teacher_id'));
            }

            if ($request->has('day') && $request->query('day')) {
                $query->where('day', $request->query('day'));
            }

            $schedules = $query->orderBy('day', 'asc')
                ->join('lesson_hours', 'lesson_schedules.lesson_hour_id', '=', 'lesson_hours.id')
                ->orderBy('lesson_hours.order', 'asc')
                ->select('lesson_schedules.*')
                ->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data jadwal KBM berhasil diambil',
                'data' => $schedules,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving schedules: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil jadwal KBM',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'schedule_period_id' => 'nullable|exists:schedule_periods,id',
            'academic_year_id' => 'required_without:schedule_period_id|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id' => 'required|exists:studies,id',
            'teacher_id' => 'required|exists:teachers,id',
            'lesson_hour_id' => 'required|exists:lesson_hours,id',
            'classroom_id' => 'nullable|exists:classrooms,id',
            'day' => 'required|integer|min:1|max:7',
            'is_active' => 'nullable|boolean',
        ]);

        if (! empty($validated['schedule_period_id'])) {
            $period = SchedulePeriod::findOrFail($validated['schedule_period_id']);
            $validated['academic_year_id'] = $period->academic_year_id;
            $validated['academic_quarter_id'] = $period->academic_quarter_id ?? ($validated['academic_quarter_id'] ?? null);
        } else {
            $userProgramId = auth('api')->user()?->getActiveProgramId();
            if (empty($validated['academic_quarter_id'])) {
                $activeQuarter = AcademicQuarter::where('academic_year_id', $validated['academic_year_id'])
                    ->where('active', true)
                    ->first() ?? AcademicQuarter::where('academic_year_id', $validated['academic_year_id'])->first();
                $validated['academic_quarter_id'] = $activeQuarter?->id;
            }

            $period = SchedulePeriod::where('academic_year_id', $validated['academic_year_id'])
                ->when($validated['academic_quarter_id'], fn ($q, $qid) => $q->where('academic_quarter_id', $qid))
                ->when($userProgramId, fn ($q, $pid) => $q->where('program_id', $pid))
                ->orderByDesc('is_active')
                ->orderByDesc('id')
                ->first();

            if (! $period) {
                $yearObj = AcademicYear::find($validated['academic_year_id']);
                $period = SchedulePeriod::create([
                    'academic_year_id' => $validated['academic_year_id'],
                    'academic_quarter_id' => $validated['academic_quarter_id'],
                    'program_id' => $userProgramId,
                    'name' => 'Jadwal Periode '.($yearObj?->year ?? $validated['academic_year_id']),
                    'is_active' => false,
                    'created_by' => auth('api')->id(),
                ]);
            }

            $validated['schedule_period_id'] = $period->id;
        }

        // Validasi cakupan program role pengguna
        $userProgramId = auth('api')->user()?->getActiveProgramId();
        if ($userProgramId) {
            $targetGroup = ClassGroup::with('educationalInstitution')->find($validated['class_group_id']);
            $groupProgramId = $targetGroup?->program_id ?? $targetGroup?->educationalInstitution?->program_id;
            if ($groupProgramId && (int) $groupProgramId !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki akses untuk menjadwalkan rombel di program lain.',
                ], 403);
            }
            if ($period->program_id && (int) $period->program_id !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki akses ke periode jadwal program lain.',
                ], 403);
            }
        }

        // Cek 0: Mata Pelajaran Muatan Lokal (Non-Kelas) tidak boleh masuk ke jadwal pelajaran KBM
        $studyObj = Study::find($validated['study_id']);
        if ($studyObj && $studyObj->study_type === 'muatan_lokal') {
            return response()->json([
                'status' => 'error',
                'message' => 'Mata pelajaran Muatan Lokal (Non-Kelas) tidak dimasukkan ke dalam jadwal pelajaran KBM, melainkan hanya dinilai pada akhir triwulan.',
            ], 422);
        }

        // Cek 1: Apakah rombel sudah memiliki jadwal di hari & jam tersebut pada nama jadwal ini?
        $clashGroup = LessonSchedule::where('schedule_period_id', $validated['schedule_period_id'])
            ->where('class_group_id', $validated['class_group_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashGroup) {
            return response()->json([
                'status' => 'error',
                'message' => 'Rombel ini sudah memiliki mata pelajaran pada hari dan jam tersebut di jadwal ini',
            ], 422);
        }

        // Cek 2: Apakah guru sedang mengajar di rombel lain pada hari & jam tersebut pada nama jadwal ini?
        $clashTeacher = LessonSchedule::where('schedule_period_id', $validated['schedule_period_id'])
            ->where('teacher_id', $validated['teacher_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashTeacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Guru tersebut sudah terjadwal mengajar di rombel lain pada hari dan jam yang sama di jadwal ini',
            ], 422);
        }

        try {
            // Bersihkan sisa soft-deleted slot yang identik agar tidak bentrok dengan unique constraint
            LessonSchedule::onlyTrashed()
                ->where('schedule_period_id', $validated['schedule_period_id'])
                ->where('class_group_id', $validated['class_group_id'])
                ->where('day', $validated['day'])
                ->where('lesson_hour_id', $validated['lesson_hour_id'])
                ->forceDelete();

            $schedule = LessonSchedule::create($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Jadwal pelajaran berhasil ditambahkan',
                'data' => $schedule->load(['academicQuarter', 'schedulePeriod', 'classGroup', 'study', 'teacher', 'lessonHour']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating schedule: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat jadwal pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $schedule = LessonSchedule::with([
            'academicYear',
            'academicQuarter',
            'schedulePeriod',
            'classGroup',
            'study',
            'teacher',
            'lessonHour',
            'classroom',
        ])->find($id);

        if (! $schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail jadwal berhasil diambil',
            'data' => $schedule,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $schedule = LessonSchedule::find($id);

        if (! $schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'academic_year_id' => 'sometimes|required|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'class_group_id' => 'sometimes|required|exists:class_groups,id',
            'study_id' => 'sometimes|required|exists:studies,id',
            'teacher_id' => 'sometimes|required|exists:teachers,id',
            'lesson_hour_id' => 'sometimes|required|exists:lesson_hours,id',
            'classroom_id' => 'nullable|exists:classrooms,id',
            'day' => 'sometimes|required|integer|min:1|max:7',
            'is_active' => 'nullable|boolean',
        ]);

        $targetPeriodId = $schedule->schedule_period_id;
        $targetYearId = $validated['academic_year_id'] ?? $schedule->academic_year_id;
        $targetQuarterId = array_key_exists('academic_quarter_id', $validated)
            ? $validated['academic_quarter_id']
            : $schedule->academic_quarter_id;
        $targetGroupId = $validated['class_group_id'] ?? $schedule->class_group_id;

        $userProgramId = auth('api')->user()?->getActiveProgramId();
        if ($userProgramId) {
            $targetGroup = ClassGroup::with('educationalInstitution')->find($targetGroupId);
            $groupProgramId = $targetGroup?->program_id ?? $targetGroup?->educationalInstitution?->program_id;
            if ($groupProgramId && (int) $groupProgramId !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki akses untuk mengubah jadwal rombel di program lain.',
                ], 403);
            }
        }
        $targetStudyId = $validated['study_id'] ?? $schedule->study_id;
        $targetTeacherId = $validated['teacher_id'] ?? $schedule->teacher_id;
        $targetHourId = $validated['lesson_hour_id'] ?? $schedule->lesson_hour_id;
        $targetDay = $validated['day'] ?? $schedule->day;

        // Cek 0: Mata Pelajaran Muatan Lokal (Non-Kelas) tidak boleh masuk ke jadwal pelajaran KBM
        $studyObj = Study::find($targetStudyId);
        if ($studyObj && $studyObj->study_type === 'muatan_lokal') {
            return response()->json([
                'status' => 'error',
                'message' => 'Mata pelajaran Muatan Lokal (Non-Kelas) tidak dimasukkan ke dalam jadwal pelajaran KBM, melainkan hanya dinilai pada akhir triwulan.',
            ], 422);
        }

        // Cek 1: Apakah rombel sudah memiliki jadwal lain di hari & jam tersebut pada periode jadwal ini?
        $clashGroup = LessonSchedule::where('id', '!=', $schedule->id)
            ->when($targetPeriodId, fn ($q, $pid) => $q->where('schedule_period_id', $pid), function ($q) use ($targetYearId, $targetQuarterId) {
                $q->where('academic_year_id', $targetYearId)
                    ->when($targetQuarterId, fn ($sq, $qId) => $sq->where('academic_quarter_id', $qId));
            })
            ->where('class_group_id', $targetGroupId)
            ->where('day', $targetDay)
            ->where('lesson_hour_id', $targetHourId)
            ->exists();

        if ($clashGroup) {
            return response()->json([
                'status' => 'error',
                'message' => 'Rombel ini sudah memiliki mata pelajaran lain pada hari dan jam tersebut di jadwal ini',
            ], 422);
        }

        // Cek 2: Apakah guru sedang mengajar di rombel lain pada hari & jam tersebut pada periode jadwal ini?
        $clashTeacher = LessonSchedule::where('id', '!=', $schedule->id)
            ->when($targetPeriodId, fn ($q, $pid) => $q->where('schedule_period_id', $pid), function ($q) use ($targetYearId, $targetQuarterId) {
                $q->where('academic_year_id', $targetYearId)
                    ->when($targetQuarterId, fn ($sq, $qId) => $sq->where('academic_quarter_id', $qId));
            })
            ->where('teacher_id', $targetTeacherId)
            ->where('day', $targetDay)
            ->where('lesson_hour_id', $targetHourId)
            ->exists();

        if ($clashTeacher) {
            return response()->json([
                'status' => 'error',
                'message' => 'Guru tersebut sudah terjadwal mengajar di rombel lain pada hari dan jam yang sama di jadwal ini',
            ], 422);
        }

        try {
            if ($targetPeriodId) {
                LessonSchedule::onlyTrashed()
                    ->where('schedule_period_id', $targetPeriodId)
                    ->where('class_group_id', $targetGroupId)
                    ->where('day', $targetDay)
                    ->where('lesson_hour_id', $targetHourId)
                    ->forceDelete();
            }

            $schedule->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Jadwal pelajaran berhasil diperbarui',
                'data' => $schedule->fresh([
                    'academicYear',
                    'academicQuarter',
                    'schedulePeriod',
                    'classGroup.program',
                    'classGroup.educationalInstitution',
                    'classGroup.education',
                    'classGroup.educationClass',
                    'study',
                    'teacher',
                    'lessonHour',
                    'classroom',
                ]),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating schedule: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui jadwal',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $schedule = LessonSchedule::with('classGroup.educationalInstitution')->find($id);

        if (! $schedule) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        $userProgramId = auth('api')->user()?->getActiveProgramId();
        if ($userProgramId) {
            $groupProgramId = $schedule->classGroup?->program_id ?? $schedule->classGroup?->educationalInstitution?->program_id;
            if ($groupProgramId && (int) $groupProgramId !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki akses untuk menghapus jadwal rombel di program lain.',
                ], 403);
            }
        }

        try {
            $schedule->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Jadwal berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting schedule: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus jadwal',
            ], 500);
        }
    }

    /**
     * Salin jadwal untuk satu periode (misal: Ula Caturwulan 1 ke Ula Caturwulan 2).
     * Dapat dibatasi pada satu jenjang pendidikan (education_id) atau semua jenjang.
     */
    public function copyPeriod(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'from_quarter_id' => 'required|exists:academic_quarters,id',
            'to_quarter_id' => 'required|exists:academic_quarters,id',
            'from_schedule_period_id' => 'nullable|exists:schedule_periods,id',
            'to_schedule_period_id' => 'nullable|exists:schedule_periods,id',
            'new_schedule_name' => 'nullable|string|max:150',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'education_id' => 'nullable',
            'target_academic_year_id' => 'nullable|exists:academic_years,id',
            'mode' => 'nullable|in:overwrite,skip_existing',
        ]);

        $sourceYearId = $validated['academic_year_id'];
        $targetYearId = $validated['target_academic_year_id'] ?? $sourceYearId;
        $fromQuarterId = $validated['from_quarter_id'];
        $toQuarterId = $validated['to_quarter_id'];
        $educationId = $validated['education_id'] ?? null;
        $mode = $validated['mode'] ?? 'overwrite';

        if (
            (int) $fromQuarterId === (int) $toQuarterId &&
            (int) $sourceYearId === (int) $targetYearId &&
            empty($validated['to_schedule_period_id']) &&
            empty($validated['new_schedule_name'])
        ) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pilih periode tujuan yang berbeda atau buat nama jadwal baru.',
            ], 422);
        }

        // Validasi keberadaan periode
        $fromQuarter = AcademicQuarter::where('id', $fromQuarterId)->where('academic_year_id', $sourceYearId)->first();
        if (! $fromQuarter) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode asal tidak sesuai dengan tahun akademik asal.',
            ], 422);
        }

        $toQuarter = AcademicQuarter::where('id', $toQuarterId)->where('academic_year_id', $targetYearId)->first();
        if (! $toQuarter) {
            return response()->json([
                'status' => 'error',
                'message' => 'Periode tujuan tidak sesuai dengan tahun akademik tujuan.',
            ], 422);
        }

        // Ambil rombel pada tahun dan jenjang asal (dibatasi oleh cakupan program role pengguna)
        $userProgramId = auth('api')->user()?->getActiveProgramId();
        $sourceGroupQuery = ClassGroup::where('academic_year_id', $sourceYearId);
        if ($userProgramId) {
            $sourceGroupQuery->where('program_id', $userProgramId);
        }
        if ($educationId && $educationId !== 'all') {
            $sourceGroupQuery->where(function ($q) use ($educationId) {
                $q->where('educational_institution_id', $educationId)
                    ->orWhere('education_id', $educationId);
            });
        }
        $sourceGroupIds = $sourceGroupQuery->pluck('id');

        if ($sourceGroupIds->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak ditemukan rombel/kelas pada jenjang dan tahun akademik asal yang dipilih.',
            ], 404);
        }

        // Ambil jadwal sumber (prioritaskan from_schedule_period_id jika disediakan, atau periode aktif/terbaru di quarter asal)
        $fromSchedulePeriodId = $validated['from_schedule_period_id'] ?? null;
        if (! $fromSchedulePeriodId) {
            $fromSchedulePeriodId = SchedulePeriod::where('academic_year_id', $sourceYearId)
                ->where('academic_quarter_id', $fromQuarterId)
                ->orderByDesc('is_active')
                ->orderByDesc('id')
                ->value('id');
        }

        $sourceSchedules = LessonSchedule::where('academic_year_id', $sourceYearId)
            ->where('academic_quarter_id', $fromQuarterId)
            ->when($fromSchedulePeriodId, fn ($q, $pid) => $q->where('schedule_period_id', $pid))
            ->whereIn('class_group_id', $sourceGroupIds)
            ->get();

        if ($sourceSchedules->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => "Tidak ada jadwal pada {$fromQuarter->name} untuk jenjang yang dipilih.",
            ], 404);
        }

        DB::beginTransaction();
        try {
            // Tentukan / buat SchedulePeriod tujuan (default berstatus Draft / Belum Berlaku jika baru)
            $targetSchedulePeriod = null;
            if (! empty($validated['to_schedule_period_id'])) {
                $targetSchedulePeriod = SchedulePeriod::findOrFail($validated['to_schedule_period_id']);
            } elseif (! empty($validated['new_schedule_name'])) {
                $targetSchedulePeriod = SchedulePeriod::create([
                    'academic_year_id' => $targetYearId,
                    'academic_quarter_id' => $toQuarterId,
                    'program_id' => $userProgramId,
                    'name' => trim($validated['new_schedule_name']),
                    'description' => "Salinan jadwal dari {$fromQuarter->name}",
                    'effective_start_date' => $validated['effective_start_date'] ?? null,
                    'effective_end_date' => $validated['effective_end_date'] ?? null,
                    'is_active' => false,
                    'created_by' => auth('api')->id(),
                ]);
            } else {
                $targetSchedulePeriod = SchedulePeriod::where('academic_year_id', $targetYearId)
                    ->where('academic_quarter_id', $toQuarterId)
                    ->orderByDesc('is_active')
                    ->orderByDesc('id')
                    ->first();

                if (! $targetSchedulePeriod) {
                    $targetYearObj = AcademicYear::find($targetYearId);
                    $targetSchedulePeriod = SchedulePeriod::create([
                        'academic_year_id' => $targetYearId,
                        'academic_quarter_id' => $toQuarterId,
                        'program_id' => $userProgramId,
                        'name' => 'Jadwal '.($targetYearObj?->year ?? $targetYearId).' - '.$toQuarter->name,
                        'description' => "Salinan jadwal dari {$fromQuarter->name}",
                        'effective_start_date' => $validated['effective_start_date'] ?? null,
                        'effective_end_date' => $validated['effective_end_date'] ?? null,
                        'is_active' => false,
                        'created_by' => auth('api')->id(),
                    ]);
                }
            }

            $copiedCount = 0;
            $updatedCount = 0;
            $skippedCount = 0;

            // Pemetaan rombel jika tahun tujuan berbeda
            $groupMap = [];
            if ($sourceYearId !== $targetYearId) {
                foreach ($sourceGroupIds as $sGroupId) {
                    $sGroup = ClassGroup::with('educationalInstitution')->find($sGroupId);
                    $tGroup = ClassGroup::where('academic_year_id', $targetYearId)
                        ->where(function ($q) use ($sGroup) {
                            if ($sGroup->code) {
                                $q->where('code', $sGroup->code);
                            } else {
                                $q->where('name', $sGroup->name);
                            }
                        })->first();

                    if (! $tGroup) {
                        $tGroup = ClassGroup::create([
                            'academic_year_id' => $targetYearId,
                            'program_id' => $sGroup->program_id ?? $sGroup->educationalInstitution?->program_id,
                            'educational_institution_id' => $sGroup->educational_institution_id,
                            'education_id' => $sGroup->education_id,
                            'education_class_id' => $sGroup->education_class_id,
                            'classroom_id' => $sGroup->classroom_id,
                            'homeroom_teacher_id' => $sGroup->homeroom_teacher_id,
                            'code' => $sGroup->code,
                            'name' => $sGroup->name,
                            'gender' => $sGroup->gender,
                            'progression_type' => $sGroup->progression_type,
                            'target_level' => $sGroup->target_level,
                            'capacity' => $sGroup->capacity,
                            'is_active' => true,
                        ]);
                    }
                    $groupMap[$sGroupId] = $tGroup->id;
                }
            }

            foreach ($sourceSchedules as $source) {
                $targetGroupId = ($sourceYearId === $targetYearId)
                    ? $source->class_group_id
                    : ($groupMap[$source->class_group_id] ?? null);

                if (! $targetGroupId) {
                    $skippedCount++;

                    continue;
                }

                $existing = LessonSchedule::where('schedule_period_id', $targetSchedulePeriod->id)
                    ->where('class_group_id', $targetGroupId)
                    ->where('day', $source->day)
                    ->where('lesson_hour_id', $source->lesson_hour_id)
                    ->first();

                if ($existing) {
                    if ($mode === 'overwrite') {
                        $existing->update([
                            'study_id' => $source->study_id,
                            'teacher_id' => $source->teacher_id,
                            'classroom_id' => $source->classroom_id,
                            'is_active' => $source->is_active,
                        ]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } else {
                    LessonSchedule::onlyTrashed()
                        ->where('schedule_period_id', $targetSchedulePeriod->id)
                        ->where('class_group_id', $targetGroupId)
                        ->where('day', $source->day)
                        ->where('lesson_hour_id', $source->lesson_hour_id)
                        ->forceDelete();

                    LessonSchedule::create([
                        'academic_year_id' => $targetYearId,
                        'academic_quarter_id' => $toQuarterId,
                        'schedule_period_id' => $targetSchedulePeriod->id,
                        'class_group_id' => $targetGroupId,
                        'study_id' => $source->study_id,
                        'teacher_id' => $source->teacher_id,
                        'lesson_hour_id' => $source->lesson_hour_id,
                        'classroom_id' => $source->classroom_id,
                        'day' => $source->day,
                        'is_active' => $source->is_active,
                    ]);
                    $copiedCount++;
                }
            }

            DB::commit();

            $eduName = 'Semua Jenjang';
            if ($educationId && $educationId !== 'all') {
                $inst = \App\Models\EducationalInstitution::find($educationId);
                $edu = Education::find($educationId);
                if ($inst) {
                    $eduName = "Jenjang {$inst->name}";
                } elseif ($edu) {
                    $eduName = "Jenjang {$edu->name}";
                }
            }

            return response()->json([
                'status' => 'success',
                'message' => "Jadwal {$eduName} berhasil disalin ke \"{$targetSchedulePeriod->name}\" ({$toQuarter->name})",
                'data' => [
                    'copied' => $copiedCount,
                    'overwritten' => $updatedCount,
                    'skipped' => $skippedCount,
                    'total_source' => $sourceSchedules->count(),
                    'from_quarter' => $fromQuarter->name,
                    'to_quarter' => $toQuarter->name,
                    'education' => $eduName,
                    'target_schedule_period' => $targetSchedulePeriod->fresh(['academicYear', 'academicQuarter'])->loadCount('schedules'),
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error copying period schedules: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyalin jadwal periode: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Salin jadwal seluruh jenjang (atau jenjang tertentu) ke tahun akademik berikutnya.
     * Otomatis membuat rombel di tahun tujuan jika belum ada, dan menyimpan hasil salinan sebagai draft.
     */
    public function copyAcademicYear(Request $request)
    {
        $validated = $request->validate([
            'from_academic_year_id' => 'required|exists:academic_years,id',
            'to_academic_year_id' => 'required|exists:academic_years,id|different:from_academic_year_id',
            'education_id' => 'nullable',
            'from_quarter_id' => 'nullable|exists:academic_quarters,id',
            'to_quarter_id' => 'nullable|exists:academic_quarters,id',
            'from_schedule_period_id' => 'nullable|exists:schedule_periods,id',
            'new_schedule_name' => 'nullable|string|max:150',
            'effective_start_date' => 'nullable|date',
            'effective_end_date' => 'nullable|date|after_or_equal:effective_start_date',
            'auto_create_class_groups' => 'nullable|boolean',
            'mode' => 'nullable|in:overwrite,skip_existing',
        ]);

        $fromYearId = $validated['from_academic_year_id'];
        $toYearId = $validated['to_academic_year_id'];
        $educationId = $validated['education_id'] ?? null;
        $autoCreateGroups = $validated['auto_create_class_groups'] ?? true;
        $mode = $validated['mode'] ?? 'overwrite';

        $fromYear = AcademicYear::with('quarters')->findOrFail($fromYearId);
        $toYear = AcademicYear::with('quarters')->findOrFail($toYearId);

        $fromQuarters = $fromYear->quarters()->orderBy('id')->get();
        $toQuarters = $toYear->quarters()->orderBy('id')->get();

        // Buat periode quarter pada tahun tujuan jika belum ada
        if ($toQuarters->isEmpty() && $fromQuarters->isNotEmpty()) {
            foreach ($fromQuarters as $fq) {
                $newQ = AcademicQuarter::create([
                    'academic_year_id' => $toYearId,
                    'name' => $fq->name,
                    'start_date' => $toYear->start_date ?? now(),
                    'end_date' => $toYear->end_date ?? now()->addYear(),
                    'active' => $fq->active,
                ]);
                $toQuarters->push($newQ);
            }
        }

        // Pemetaan quarter
        $quarterMap = [];
        if (! empty($validated['from_quarter_id']) && ! empty($validated['to_quarter_id'])) {
            $quarterMap[$validated['from_quarter_id']] = $validated['to_quarter_id'];
        } else {
            foreach ($fromQuarters as $idx => $fq) {
                $matched = $toQuarters->firstWhere('name', $fq->name) ?? ($toQuarters[$idx] ?? null);
                if ($matched) {
                    $quarterMap[$fq->id] = $matched->id;
                }
            }
        }

        // Ambil rombel pada tahun asal (dibatasi cakupan program role pengguna)
        $userProgramId = auth('api')->user()?->getActiveProgramId();
        $sourceGroupQuery = ClassGroup::where('academic_year_id', $fromYearId);
        if ($userProgramId) {
            $sourceGroupQuery->where('program_id', $userProgramId);
        }
        if ($educationId && $educationId !== 'all') {
            $sourceGroupQuery->where(function ($q) use ($educationId) {
                $q->where('educational_institution_id', $educationId)
                    ->orWhere('education_id', $educationId);
            });
        }
        $sourceGroups = $sourceGroupQuery->with('educationalInstitution')->get();

        if ($sourceGroups->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => "Tidak ada rombel pada tahun akademik {$fromYear->year}.",
            ], 404);
        }

        // Ambil jadwal sumber
        $schedulesQuery = LessonSchedule::where('academic_year_id', $fromYearId)
            ->whereIn('class_group_id', $sourceGroups->pluck('id'));

        if (! empty($validated['from_schedule_period_id'])) {
            $schedulesQuery->where('schedule_period_id', $validated['from_schedule_period_id']);
        }
        if (! empty($validated['from_quarter_id'])) {
            $schedulesQuery->where('academic_quarter_id', $validated['from_quarter_id']);
        }

        $sourceSchedules = $schedulesQuery->get();

        if ($sourceSchedules->isEmpty()) {
            return response()->json([
                'status' => 'error',
                'message' => "Tidak ditemukan jadwal untuk disalin pada tahun akademik {$fromYear->year}.",
            ], 404);
        }

        DB::beginTransaction();
        try {
            $groupMap = [];
            $createdGroupsCount = 0;

            foreach ($sourceGroups as $sg) {
                $tg = ClassGroup::where('academic_year_id', $toYearId)
                    ->where(function ($q) use ($sg) {
                        if ($sg->code) {
                            $q->where('code', $sg->code);
                        } else {
                            $q->where('name', $sg->name);
                        }
                    })->first();

                if (! $tg && $autoCreateGroups) {
                    $tg = ClassGroup::create([
                        'academic_year_id' => $toYearId,
                        'program_id' => $sg->program_id ?? $sg->educationalInstitution?->program_id,
                        'educational_institution_id' => $sg->educational_institution_id,
                        'education_id' => $sg->education_id,
                        'education_class_id' => $sg->education_class_id,
                        'classroom_id' => $sg->classroom_id,
                        'homeroom_teacher_id' => $sg->homeroom_teacher_id,
                        'code' => $sg->code,
                        'name' => $sg->name,
                        'gender' => $sg->gender,
                        'progression_type' => $sg->progression_type,
                        'target_level' => $sg->target_level,
                        'capacity' => $sg->capacity,
                        'is_active' => true,
                    ]);
                    $createdGroupsCount++;
                }

                if ($tg) {
                    $groupMap[$sg->id] = $tg->id;
                }
            }

            $targetPeriodCache = [];
            $copiedCount = 0;
            $updatedCount = 0;
            $skippedCount = 0;

            foreach ($sourceSchedules as $source) {
                $targetGroupId = $groupMap[$source->class_group_id] ?? null;
                if (! $targetGroupId) {
                    $skippedCount++;

                    continue;
                }

                $targetQuarterId = $quarterMap[$source->academic_quarter_id] ?? $toQuarters->first()?->id;
                $cacheKey = (string) ($targetQuarterId ?? 'year');

                if (! isset($targetPeriodCache[$cacheKey])) {
                    $targetQ = $targetQuarterId ? $toQuarters->firstWhere('id', $targetQuarterId) : null;
                    $defaultName = ! empty($validated['new_schedule_name'])
                        ? trim($validated['new_schedule_name']).($targetQ ? " ({$targetQ->name})" : '')
                        : "Jadwal Periode {$toYear->year}".($targetQ ? " - {$targetQ->name}" : '');

                    $tp = SchedulePeriod::where('academic_year_id', $toYearId)
                        ->when($targetQuarterId, fn ($q, $qid) => $q->where('academic_quarter_id', $qid))
                        ->when($userProgramId, fn ($q, $pid) => $q->where('program_id', $pid))
                        ->when(! empty($validated['new_schedule_name']), fn ($q) => $q->where('name', mb_substr($defaultName, 0, 150)))
                        ->orderByDesc('id')
                        ->first();

                    if (! $tp) {
                        $tp = SchedulePeriod::create([
                            'academic_year_id' => $toYearId,
                            'academic_quarter_id' => $targetQuarterId,
                            'program_id' => $userProgramId,
                            'name' => mb_substr($defaultName, 0, 150),
                            'description' => "Salinan jadwal dari tahun akademik {$fromYear->year}",
                            'effective_start_date' => $validated['effective_start_date'] ?? null,
                            'effective_end_date' => $validated['effective_end_date'] ?? null,
                            'is_active' => false,
                            'created_by' => auth('api')->id(),
                        ]);
                    }
                    $targetPeriodCache[$cacheKey] = $tp;
                }

                $targetPeriod = $targetPeriodCache[$cacheKey];

                $existing = LessonSchedule::where('schedule_period_id', $targetPeriod->id)
                    ->where('class_group_id', $targetGroupId)
                    ->where('day', $source->day)
                    ->where('lesson_hour_id', $source->lesson_hour_id)
                    ->first();

                if ($existing) {
                    if ($mode === 'overwrite') {
                        $existing->update([
                            'study_id' => $source->study_id,
                            'teacher_id' => $source->teacher_id,
                            'classroom_id' => $source->classroom_id,
                            'is_active' => $source->is_active,
                        ]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } else {
                    LessonSchedule::onlyTrashed()
                        ->where('schedule_period_id', $targetPeriod->id)
                        ->where('class_group_id', $targetGroupId)
                        ->where('day', $source->day)
                        ->where('lesson_hour_id', $source->lesson_hour_id)
                        ->forceDelete();

                    LessonSchedule::create([
                        'academic_year_id' => $toYearId,
                        'academic_quarter_id' => $targetQuarterId,
                        'schedule_period_id' => $targetPeriod->id,
                        'class_group_id' => $targetGroupId,
                        'study_id' => $source->study_id,
                        'teacher_id' => $source->teacher_id,
                        'lesson_hour_id' => $source->lesson_hour_id,
                        'classroom_id' => $source->classroom_id,
                        'day' => $source->day,
                        'is_active' => $source->is_active,
                    ]);
                    $copiedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Berhasil menyalin jadwal dari {$fromYear->year} ke {$toYear->year} (status draft hingga diaktifkan)",
                'data' => [
                    'from_year' => $fromYear->year,
                    'to_year' => $toYear->year,
                    'copied' => $copiedCount,
                    'overwritten' => $updatedCount,
                    'skipped' => $skippedCount,
                    'groups_created' => $createdGroupsCount,
                    'total_source' => $sourceSchedules->count(),
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error copying academic year schedules: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyalin jadwal ke tahun akademik baru: '.$e->getMessage(),
            ], 500);
        }
    }
}
