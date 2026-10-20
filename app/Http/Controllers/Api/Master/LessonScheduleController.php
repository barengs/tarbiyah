<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\LessonSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class LessonScheduleController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = LessonSchedule::with([
                'academicYear',
                'classGroup',
                'study',
                'teacher',
                'lessonHour',
                'classroom'
            ]);

            if ($request->has('academic_year_id')) {
                $query->where('academic_year_id', $request->query('academic_year_id'));
            }

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->has('teacher_id')) {
                $query->where('teacher_id', $request->query('teacher_id'));
            }

            if ($request->has('day')) {
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
            'academic_year_id' => 'required|exists:academic_years,id',
            'class_group_id'   => 'required|exists:class_groups,id',
            'study_id'         => 'required|exists:studies,id',
            'teacher_id'       => 'required|exists:teachers,id',
            'lesson_hour_id'   => 'required|exists:lesson_hours,id',
            'classroom_id'     => 'nullable|exists:classrooms,id',
            'day'              => 'required|integer|min:1|max:7',
            'is_active'        => 'nullable|boolean',
        ]);

        // Cek 1: Apakah rombel sudah memiliki jadwal di hari & jam tersebut?
        $clashGroup = LessonSchedule::where('academic_year_id', $validated['academic_year_id'])
            ->where('class_group_id', $validated['class_group_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashGroup) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Rombel ini sudah memiliki mata pelajaran pada hari dan jam tersebut',
            ], 422);
        }

        // Cek 2: Apakah guru sedang mengajar di rombel lain pada hari & jam tersebut?
        $clashTeacher = LessonSchedule::where('academic_year_id', $validated['academic_year_id'])
            ->where('teacher_id', $validated['teacher_id'])
            ->where('day', $validated['day'])
            ->where('lesson_hour_id', $validated['lesson_hour_id'])
            ->exists();

        if ($clashTeacher) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Guru tersebut sudah terjadwal mengajar di rombel lain pada hari dan jam yang sama',
            ], 422);
        }

        try {
            $schedule = LessonSchedule::create($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jadwal pelajaran berhasil ditambahkan',
                'data'    => $schedule->load(['classGroup', 'study', 'teacher', 'lessonHour']),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Error creating schedule: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuat jadwal pelajaran',
            ], 500);
        }
    }

    public function show(string $id)
    {
        $schedule = LessonSchedule::with([
            'academicYear',
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
            'study_id'       => 'sometimes|required|exists:studies,id',
            'teacher_id'     => 'sometimes|required|exists:teachers,id',
            'lesson_hour_id' => 'sometimes|required|exists:lesson_hours,id',
            'classroom_id'   => 'nullable|exists:classrooms,id',
            'day'            => 'sometimes|required|integer|min:1|max:7',
            'is_active'      => 'nullable|boolean',
        ]);

        try {
            $schedule->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jadwal berhasil diperbarui',
                'data'    => $schedule->fresh(['classGroup', 'study', 'teacher', 'lessonHour']),
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
}
