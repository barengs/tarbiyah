<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\TeachingJournal;
use App\Models\StudentPresence;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TeachingJournalController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = TeachingJournal::with([
                'classGroup',
                'study',
                'teacher',
                'substituteTeacher',
                'lessonSchedule.lessonHour'
            ])->withCount([
                'presences as hadir_count' => function ($q) { $q->where('status', 'hadir'); },
                'presences as sakit_count' => function ($q) { $q->where('status', 'sakit'); },
                'presences as izin_count'  => function ($q) { $q->where('status', 'izin'); },
                'presences as alpa_count'  => function ($q) { $q->where('status', 'alpa'); },
            ]);

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            if ($request->has('study_id')) {
                $query->where('study_id', $request->query('study_id'));
            }

            if ($request->has('teacher_id')) {
                $query->where('teacher_id', $request->query('teacher_id'));
            }

            if ($request->has('date')) {
                $query->whereDate('date', $request->query('date'));
            }

            $journals = $query->orderBy('date', 'desc')->orderBy('meeting_number', 'desc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data jurnal KBM berhasil diambil',
                'data'    => $journals,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving teaching journals: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil jurnal KBM',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id'       => 'required|exists:academic_years,id',
            'class_group_id'         => 'required|exists:class_groups,id',
            'study_id'               => 'required|exists:studies,id',
            'teacher_id'             => 'required|exists:teachers,id',
            'lesson_schedule_id'     => 'nullable|exists:lesson_schedules,id',
            'meeting_number'         => 'required|integer|min:1',
            'date'                   => 'required|date',
            'start_time'             => 'nullable|date_format:H:i',
            'end_time'               => 'nullable|date_format:H:i',
            'topic'                  => 'required|string|max:255',
            'notes'                  => 'nullable|string',
            'teacher_status'         => 'nullable|in:hadir,izin,tugas,digantikan',
            'substitute_teacher_id'  => 'nullable|exists:teachers,id',
        ]);

        try {
            DB::beginTransaction();

            $journal = TeachingJournal::create($validated);

            // Auto-populate kehadiran semua siswa aktif di rombel ini dengan default 'hadir'
            $activeStudents = StudentClass::where('class_group_id', $validated['class_group_id'])
                ->where('status', 'aktif')
                ->get();

            $presences = [];
            $now = now();
            foreach ($activeStudents as $sc) {
                $presences[] = [
                    'teaching_journal_id' => $journal->id,
                    'student_id'          => $sc->student_id,
                    'status'              => 'hadir',
                    'notes'               => null,
                    'created_at'          => $now,
                    'updated_at'          => $now,
                ];
            }

            if (!empty($presences)) {
                StudentPresence::insert($presences);
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Jurnal KBM berhasil dibuka dan presensi disiapkan',
                'data'    => $journal->load(['classGroup', 'study', 'teacher', 'presences.student']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating teaching journal: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal membuka jurnal KBM: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $journal = TeachingJournal::with([
            'classGroup',
            'study',
            'teacher',
            'substituteTeacher',
            'presences.student'
        ])->find($id);

        if (!$journal) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Detail jurnal KBM berhasil diambil',
            'data'    => $journal,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $journal = TeachingJournal::find($id);

        if (!$journal) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'meeting_number'        => 'sometimes|required|integer|min:1',
            'date'                  => 'sometimes|required|date',
            'topic'                 => 'sometimes|required|string|max:255',
            'notes'                 => 'nullable|string',
            'teacher_status'        => 'nullable|in:hadir,izin,tugas,digantikan',
            'substitute_teacher_id' => 'nullable|exists:teachers,id',
        ]);

        try {
            $journal->update($validated);

            return response()->json([
                'status'  => 'success',
                'message' => 'Jurnal KBM berhasil diperbarui',
                'data'    => $journal->fresh(['classGroup', 'study', 'teacher']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating teaching journal: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui jurnal KBM',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $journal = TeachingJournal::find($id);

        if (!$journal) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        try {
            $journal->delete();
            return response()->json([
                'status'  => 'success',
                'message' => 'Jurnal KBM berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting teaching journal: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghapus jurnal KBM',
            ], 500);
        }
    }

    /**
     * Batch update status kehadiran siswa di pertemuan ini.
     */
    public function updatePresences(Request $request, string $id)
    {
        $journal = TeachingJournal::findOrFail($id);

        $validated = $request->validate([
            'presences'              => 'required|array',
            'presences.*.student_id' => 'required|exists:students,id',
            'presences.*.status'     => 'required|in:hadir,sakit,izin,alpa',
            'presences.*.notes'      => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['presences'] as $item) {
                StudentPresence::updateOrCreate(
                    [
                        'teaching_journal_id' => $journal->id,
                        'student_id'          => $item['student_id'],
                    ],
                    [
                        'status' => $item['status'],
                        'notes'  => $item['notes'] ?? null,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Presensi siswa berhasil disimpan',
                'data'    => $journal->fresh('presences.student'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating student presences: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui presensi siswa',
            ], 500);
        }
    }

    /**
     * Rekapitulasi absensi per rombel dan mata pelajaran.
     */
    public function recap(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id'       => 'nullable|exists:studies,id',
        ]);

        try {
            $classGroup = ClassGroup::findOrFail($validated['class_group_id']);
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get();

            $journalsQuery = TeachingJournal::where('class_group_id', $classGroup->id);
            if (!empty($validated['study_id'])) {
                $journalsQuery->where('study_id', $validated['study_id']);
            }
            $totalMeetings = $journalsQuery->count();
            $journalIds = $journalsQuery->pluck('id');

            $recapData = [];
            foreach ($students as $sc) {
                $sId = $sc->student_id;
                $hadir = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'hadir')->count();
                $sakit = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'sakit')->count();
                $izin  = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'izin')->count();
                $alpa  = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                    ->where('student_id', $sId)->where('status', 'alpa')->count();

                $pct = $totalMeetings > 0 ? round(($hadir / $totalMeetings) * 100, 1) : 100;

                $recapData[] = [
                    'student_id'   => $sId,
                    'name'         => $sc->student->name,
                    'nis'          => $sc->student->nis,
                    'hadir'        => $hadir,
                    'sakit'        => $sakit,
                    'izin'         => $izin,
                    'alpa'         => $alpa,
                    'percentage'   => $pct,
                ];
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Rekapitulasi presensi berhasil dihitung',
                'data'    => [
                    'class_group'    => $classGroup->name,
                    'total_meetings' => $totalMeetings,
                    'students'       => $recapData,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error generating attendance recap: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menghitung rekap presensi',
            ], 500);
        }
    }
}
