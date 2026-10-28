<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\LessonSchedule;
use App\Models\AcademicYear;
use App\Models\AcademicQuarter;
use App\Models\ClassGroup;
use App\Models\Education;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LessonScheduleController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = LessonSchedule::with([
                'academicYear',
                'academicQuarter',
                'classGroup',
                'study',
                'teacher',
                'lessonHour',
                'classroom'
            ]);

            if ($request->has('academic_year_id') && $request->query('academic_year_id')) {
                $query->where('academic_year_id', $request->query('academic_year_id'));
            }

            if ($request->has('academic_quarter_id') && $request->query('academic_quarter_id')) {
                $query->where('academic_quarter_id', $request->query('academic_quarter_id'));
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
                'status'  => 'success',
                'message' => 'Data jadwal KBM berhasil diambil',
                'data'    => $schedules,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving schedules: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil jadwal KBM',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id'    => 'required|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'class_group_id'      => 'required|exists:class_groups,id',
            'study_id'            => 'required|exists:studies,id',
            'teacher_id'          => 'required|exists:teachers,id',
            'lesson_hour_id'      => 'required|exists:lesson_hours,id',
            'classroom_id'        => 'nullable|exists:classrooms,id',
            'day'                 => 'required|integer|min:1|max:7',
            'is_active'           => 'nullable|boolean',
        ]);

        if (empty($validated['academic_quarter_id'])) {
            $activeQuarter = AcademicQuarter::where('academic_year_id', $validated['academic_year_id'])
                ->where('active', true)
                ->first() ?? AcademicQuarter::where('academic_year_id', $validated['academic_year_id'])->first();
            $validated['academic_quarter_id'] = $activeQuarter?->id;
        }

        // Cek 1: Apakah rombel sudah memiliki jadwal di hari & jam tersebut pada periode ini?
        $clashGroup = LessonSchedule::where('academic_year_id', $validated['academic_year_id'])
            ->when($validated['academic_quarter_id'], function ($q, $qId) {
                $q->where('academic_quarter_id', $qId);
            })
            ->where('class_group_id', $validated['class_group_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashGroup) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rombel ini sudah memiliki mata pelajaran pada hari dan jam tersebut di periode ini',
            ], 422);
        }

        // Cek 2: Apakah guru sedang mengajar di rombel lain pada hari & jam tersebut pada periode ini?
        $clashTeacher = LessonSchedule::where('academic_year_id', $validated['academic_year_id'])
            ->when($validated['academic_quarter_id'], function ($q, $qId) {
                $q->where('academic_quarter_id', $qId);
            })
            ->where('teacher_id', $validated['teacher_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashTeacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Guru tersebut sudah terjadwal mengajar di rombel lain pada hari dan jam yang sama di periode ini',
            ], 422);
        }

        try {
            $schedule = LessonSchedule::create($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jadwal pelajaran berhasil ditambahkan',
                'data'    => $schedule->load(['academicQuarter', 'classGroup', 'study', 'teacher', 'lessonHour']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating schedule: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat jadwal pelajaran: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $schedule = LessonSchedule::with([
            'academicYear',
            'academicQuarter',
            'classGroup',
            'study',
            'teacher',
            'lessonHour',
            'classroom'
        ])->find($id);

        if (!$schedule) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail jadwal berhasil diambil',
            'data'    => $schedule,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $schedule = LessonSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'study_id'            => 'sometimes|required|exists:studies,id',
            'teacher_id'          => 'sometimes|required|exists:teachers,id',
            'lesson_hour_id'      => 'sometimes|required|exists:lesson_hours,id',
            'classroom_id'        => 'nullable|exists:classrooms,id',
            'day'                 => 'sometimes|required|integer|min:1|max:7',
            'is_active'           => 'nullable|boolean',
        ]);

        try {
            $schedule->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jadwal berhasil diperbarui',
                'data'    => $schedule->fresh(['academicQuarter', 'classGroup', 'study', 'teacher', 'lessonHour']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating schedule: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui jadwal',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $schedule = LessonSchedule::find($id);

        if (!$schedule) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jadwal tidak ditemukan',
            ], 404);
        }

        try {
            $schedule->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Jadwal berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting schedule: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
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
            'academic_year_id'        => 'required|exists:academic_years,id',
            'from_quarter_id'         => 'required|exists:academic_quarters,id',
            'to_quarter_id'           => 'required|exists:academic_quarters,id|different:from_quarter_id',
            'education_id'            => 'nullable',
            'target_academic_year_id' => 'nullable|exists:academic_years,id',
            'mode'                    => 'nullable|in:overwrite,skip_existing',
        ]);

        $sourceYearId = $validated['academic_year_id'];
        $targetYearId = $validated['target_academic_year_id'] ?? $sourceYearId;
        $fromQuarterId = $validated['from_quarter_id'];
        $toQuarterId = $validated['to_quarter_id'];
        $educationId = $validated['education_id'] ?? null;
        $mode = $validated['mode'] ?? 'overwrite';

        // Validasi keberadaan periode
        $fromQuarter = AcademicQuarter::where('id', $fromQuarterId)->where('academic_year_id', $sourceYearId)->first();
        if (!$fromQuarter) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Periode asal tidak sesuai dengan tahun akademik asal.',
            ], 422);
        }

        $toQuarter = AcademicQuarter::where('id', $toQuarterId)->where('academic_year_id', $targetYearId)->first();
        if (!$toQuarter) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Periode tujuan tidak sesuai dengan tahun akademik tujuan.',
            ], 422);
        }

        // Ambil rombel pada tahun dan jenjang asal
        $sourceGroupQuery = ClassGroup::where('academic_year_id', $sourceYearId);
        if ($educationId && $educationId !== 'all') {
            $sourceGroupQuery->where('education_id', $educationId);
        }
        $sourceGroupIds = $sourceGroupQuery->pluck('id');

        if ($sourceGroupIds->isEmpty()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Tidak ditemukan rombel/kelas pada jenjang dan tahun akademik asal yang dipilih.',
            ], 404);
        }

        // Ambil jadwal sumber
        $sourceSchedules = LessonSchedule::where('academic_year_id', $sourceYearId)
            ->where('academic_quarter_id', $fromQuarterId)
            ->whereIn('class_group_id', $sourceGroupIds)
            ->get();

        if ($sourceSchedules->isEmpty()) {
            return response()->json([
                'status'  => 'error',
                'message' => "Tidak ada jadwal pada {$fromQuarter->name} untuk jenjang yang dipilih.",
            ], 404);
        }

        DB::beginTransaction();
        try {
            $copiedCount = 0;
            $updatedCount = 0;
            $skippedCount = 0;

            // Pemetaan rombel jika tahun tujuan berbeda
            $groupMap = [];
            if ($sourceYearId !== $targetYearId) {
                foreach ($sourceGroupIds as $sGroupId) {
                    $sGroup = ClassGroup::find($sGroupId);
                    $tGroup = ClassGroup::where('academic_year_id', $targetYearId)
                        ->where(function ($q) use ($sGroup) {
                            if ($sGroup->code) {
                                $q->where('code', $sGroup->code);
                            } else {
                                $q->where('name', $sGroup->name);
                            }
                        })->first();

                    if (!$tGroup) {
                        $tGroup = ClassGroup::create([
                            'academic_year_id'           => $targetYearId,
                            'educational_institution_id' => $sGroup->educational_institution_id,
                            'education_id'               => $sGroup->education_id,
                            'education_class_id'         => $sGroup->education_class_id,
                            'classroom_id'               => $sGroup->classroom_id,
                            'homeroom_teacher_id'        => $sGroup->homeroom_teacher_id,
                            'code'                       => $sGroup->code,
                            'name'                       => $sGroup->name,
                            'gender'                     => $sGroup->gender,
                            'progression_type'           => $sGroup->progression_type,
                            'target_level'               => $sGroup->target_level,
                            'capacity'                   => $sGroup->capacity,
                            'is_active'                  => true,
                        ]);
                    }
                    $groupMap[$sGroupId] = $tGroup->id;
                }
            }

            foreach ($sourceSchedules as $source) {
                $targetGroupId = ($sourceYearId === $targetYearId)
                    ? $source->class_group_id
                    : ($groupMap[$source->class_group_id] ?? null);

                if (!$targetGroupId) {
                    $skippedCount++;
                    continue;
                }

                $existing = LessonSchedule::where('academic_year_id', $targetYearId)
                    ->where('academic_quarter_id', $toQuarterId)
                    ->where('class_group_id', $targetGroupId)
                    ->where('day', $source->day)
                    ->where('lesson_hour_id', $source->lesson_hour_id)
                    ->first();

                if ($existing) {
                    if ($mode === 'overwrite') {
                        $existing->update([
                            'study_id'     => $source->study_id,
                            'teacher_id'   => $source->teacher_id,
                            'classroom_id' => $source->classroom_id,
                            'is_active'    => $source->is_active,
                        ]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } else {
                    LessonSchedule::create([
                        'academic_year_id'    => $targetYearId,
                        'academic_quarter_id' => $toQuarterId,
                        'class_group_id'      => $targetGroupId,
                        'study_id'            => $source->study_id,
                        'teacher_id'          => $source->teacher_id,
                        'lesson_hour_id'      => $source->lesson_hour_id,
                        'classroom_id'        => $source->classroom_id,
                        'day'                 => $source->day,
                        'is_active'           => $source->is_active,
                    ]);
                    $copiedCount++;
                }
            }

            DB::commit();

            $eduName = 'Semua Jenjang';
            if ($educationId && $educationId !== 'all') {
                $edu = Education::find($educationId);
                if ($edu) $eduName = "Jenjang {$edu->name}";
            }

            return response()->json([
                'status'  => 'success',
                'message' => "Jadwal {$eduName} berhasil disalin dari {$fromQuarter->name} ke {$toQuarter->name}",
                'data'    => [
                    'copied'       => $copiedCount,
                    'overwritten'  => $updatedCount,
                    'skipped'      => $skippedCount,
                    'total_source' => $sourceSchedules->count(),
                    'from_quarter' => $fromQuarter->name,
                    'to_quarter'   => $toQuarter->name,
                    'education'    => $eduName,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error copying period schedules: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyalin jadwal periode: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Salin jadwal seluruh jenjang (atau jenjang tertentu) ke tahun akademik berikutnya.
     * Otomatis membuat rombel di tahun tujuan jika belum ada.
     */
    public function copyAcademicYear(Request $request)
    {
        $validated = $request->validate([
            'from_academic_year_id'    => 'required|exists:academic_years,id',
            'to_academic_year_id'      => 'required|exists:academic_years,id|different:from_academic_year_id',
            'education_id'             => 'nullable',
            'from_quarter_id'          => 'nullable|exists:academic_quarters,id',
            'to_quarter_id'            => 'nullable|exists:academic_quarters,id',
            'auto_create_class_groups' => 'nullable|boolean',
            'mode'                     => 'nullable|in:overwrite,skip_existing',
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
                    'name'             => $fq->name,
                    'start_date'       => $toYear->start_date ?? now(),
                    'end_date'         => $toYear->end_date ?? now()->addYear(),
                    'active'           => $fq->active,
                ]);
                $toQuarters->push($newQ);
            }
        }

        // Pemetaan quarter
        $quarterMap = [];
        if (!empty($validated['from_quarter_id']) && !empty($validated['to_quarter_id'])) {
            $quarterMap[$validated['from_quarter_id']] = $validated['to_quarter_id'];
        } else {
            foreach ($fromQuarters as $idx => $fq) {
                $matched = $toQuarters->firstWhere('name', $fq->name) ?? ($toQuarters[$idx] ?? null);
                if ($matched) {
                    $quarterMap[$fq->id] = $matched->id;
                }
            }
        }

        // Ambil rombel pada tahun asal
        $sourceGroupQuery = ClassGroup::where('academic_year_id', $fromYearId);
        if ($educationId && $educationId !== 'all') {
            $sourceGroupQuery->where('education_id', $educationId);
        }
        $sourceGroups = $sourceGroupQuery->get();

        if ($sourceGroups->isEmpty()) {
            return response()->json([
                'status'  => 'error',
                'message' => "Tidak ada rombel pada tahun akademik {$fromYear->year}.",
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

                if (!$tg && $autoCreateGroups) {
                    $tg = ClassGroup::create([
                        'academic_year_id'           => $toYearId,
                        'educational_institution_id' => $sg->educational_institution_id,
                        'education_id'               => $sg->education_id,
                        'education_class_id'         => $sg->education_class_id,
                        'classroom_id'               => $sg->classroom_id,
                        'homeroom_teacher_id'        => $sg->homeroom_teacher_id,
                        'code'                       => $sg->code,
                        'name'                       => $sg->name,
                        'gender'                     => $sg->gender,
                        'progression_type'           => $sg->progression_type,
                        'target_level'               => $sg->target_level,
                        'capacity'                   => $sg->capacity,
                        'is_active'                  => true,
                    ]);
                    $createdGroupsCount++;
                }

                if ($tg) {
                    $groupMap[$sg->id] = $tg->id;
                }
            }

            // Ambil jadwal sumber
            $schedulesQuery = LessonSchedule::where('academic_year_id', $fromYearId)
                ->whereIn('class_group_id', $sourceGroups->pluck('id'));

            if (!empty($validated['from_quarter_id'])) {
                $schedulesQuery->where('academic_quarter_id', $validated['from_quarter_id']);
            }

            $sourceSchedules = $schedulesQuery->get();

            if ($sourceSchedules->isEmpty()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Tidak ditemukan jadwal untuk disalin pada tahun akademik {$fromYear->year}.",
                ], 404);
            }

            $copiedCount = 0;
            $updatedCount = 0;
            $skippedCount = 0;

            foreach ($sourceSchedules as $source) {
                $targetGroupId = $groupMap[$source->class_group_id] ?? null;
                if (!$targetGroupId) {
                    $skippedCount++;
                    continue;
                }

                $targetQuarterId = $quarterMap[$source->academic_quarter_id] ?? $toQuarters->first()?->id;

                $existing = LessonSchedule::where('academic_year_id', $toYearId)
                    ->when($targetQuarterId, fn($q, $qid) => $q->where('academic_quarter_id', $qid))
                    ->where('class_group_id', $targetGroupId)
                    ->where('day', $source->day)
                    ->where('lesson_hour_id', $source->lesson_hour_id)
                    ->first();

                if ($existing) {
                    if ($mode === 'overwrite') {
                        $existing->update([
                            'study_id'     => $source->study_id,
                            'teacher_id'   => $source->teacher_id,
                            'classroom_id' => $source->classroom_id,
                            'is_active'    => $source->is_active,
                        ]);
                        $updatedCount++;
                    } else {
                        $skippedCount++;
                    }
                } else {
                    LessonSchedule::create([
                        'academic_year_id'    => $toYearId,
                        'academic_quarter_id' => $targetQuarterId,
                        'class_group_id'      => $targetGroupId,
                        'study_id'            => $source->study_id,
                        'teacher_id'          => $source->teacher_id,
                        'lesson_hour_id'      => $source->lesson_hour_id,
                        'classroom_id'        => $source->classroom_id,
                        'day'                 => $source->day,
                        'is_active'           => $source->is_active,
                    ]);
                    $copiedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Berhasil menyalin jadwal dari {$fromYear->year} ke {$toYear->year}",
                'data'    => [
                    'from_year'      => $fromYear->year,
                    'to_year'        => $toYear->year,
                    'copied'         => $copiedCount,
                    'overwritten'    => $updatedCount,
                    'skipped'        => $skippedCount,
                    'groups_created' => $createdGroupsCount,
                    'total_source'   => $sourceSchedules->count(),
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error copying academic year schedules: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyalin jadwal ke tahun akademik baru: ' . $e->getMessage(),
            ], 500);
        }
    }
}
