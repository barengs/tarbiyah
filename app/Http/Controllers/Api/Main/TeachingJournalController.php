<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\TeachingJournal;
use App\Models\StudentPresence;
use App\Models\ClassGroup;
use App\Models\StudentClass;
use App\Models\LessonSchedule;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\AcademicYear;
use Carbon\Carbon;
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
                'lessonSchedule',
                'presences'
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

    /**
     * Lembar Presensi Matriks Pertemuan P1 - P16 (Sesuai Desain Lembar Presensi)
     */
    public function sheet(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id'       => 'nullable|exists:studies,id',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear'
            ])->findOrFail($validated['class_group_id']);

            $study = !empty($validated['study_id']) ? Study::find($validated['study_id']) : null;

            // Cari jadwal terkait untuk mata pelajaran ini jika ada
            $schedule = LessonSchedule::with(['teacher', 'lessonHour'])
                ->where('class_group_id', $classGroup->id)
                ->when($study, function($q) use ($study) {
                    $q->where('study_id', $study->id);
                })
                ->first();

            // Dapatkan santri aktif di rombel
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get()
                ->sortBy(fn($sc) => $sc->student->name ?? '')
                ->values();

            // Ambil seluruh jurnal untuk rombel (dan mapel jika difilter)
            $journalsQuery = TeachingJournal::with('presences')
                ->where('class_group_id', $classGroup->id);

            if ($study) {
                $journalsQuery->where('study_id', $study->id);
            }

            $journals = $journalsQuery->orderBy('meeting_number')->get()->keyBy('meeting_number');

            // Format 16 pertemuan standar (P1 s.d P16)
            $meetings = [];
            for ($i = 1; $i <= 16; $i++) {
                $j = $journals->get($i);
                $meetings[] = [
                    'meeting_number' => $i,
                    'journal_id'     => $j?->id,
                    'date'           => $j?->date?->format('Y-m-d'),
                    'topic'          => $j?->topic,
                    'is_recorded'    => !is_null($j),
                ];
            }

            // Matriks presensi siswa x pertemuan
            $sheetRows = [];
            foreach ($students as $sc) {
                $s = $sc->student;
                $rowAttendances = [];

                for ($i = 1; $i <= 16; $i++) {
                    $j = $journals->get($i);
                    $status = '-';
                    $notes = null;

                    if ($j) {
                        $presence = $j->presences->firstWhere('student_id', $s->id);
                        if ($presence) {
                            $status = $presence->status; // hadir, sakit, izin, alpa
                            $notes  = $presence->notes;
                        }
                    }

                    $rowAttendances[$i] = [
                        'status' => $status,
                        'notes'  => $notes,
                    ];
                }

                $sheetRows[] = [
                    'student_id'   => $s->id,
                    'nis'          => $s->nis,
                    'name'         => $s->name,
                    'gender'       => $s->gender,
                    'attendances'  => $rowAttendances,
                ];
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Lembar presensi berhasil dimuat',
                'data'    => [
                    'meta' => [
                        'academic_year' => $classGroup->academicYear?->name ?? '1446/1447 H',
                        'program'       => $classGroup->program?->name ?? 'Kubar',
                        'education'     => $classGroup->education?->name ?? 'Wustha',
                        'class_level'   => $classGroup->educationClass?->name ?? 'Kelas 1',
                        'class_group'   => $classGroup->name,
                        'study'         => $study?->name ?? 'Semua Mata Pelajaran',
                        'teacher'       => $schedule?->teacher?->name ?? $classGroup->homeroomTeacher?->name ?? '-',
                        'lesson_hour'   => $schedule?->lessonHour ? ($schedule->lessonHour->start_time . ' - ' . $schedule->lessonHour->end_time) : '07:00 - 08:30',
                    ],
                    'meetings' => $meetings,
                    'students' => $sheetRows,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading attendance sheet: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat lembar presensi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Absensi Cerdas Massal (Daily Batch 6 Jam / Weekly 36 Jam / Multi-Day)
     * Default Kehadiran: SELALU HADIR untuk seluruh santri aktif
     * Exception-based: Hanya mencatat santri yang sakit/izin/alpa
     */
    public function batchPresence(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'mode'           => 'required|in:daily,weekly,custom_days',
            'date'           => 'required|date',
            'days'           => 'nullable|array',
            'days.*'         => 'integer|between:1,7',
            'exceptions'     => 'nullable|array',
            'exceptions.*.student_id' => 'required|exists:students,id',
            'exceptions.*.status'     => 'required|in:sakit,izin,alpa,hadir',
            'exceptions.*.notes'      => 'nullable|string',
            'exceptions.*.scope'      => 'nullable|in:all,selected',
            'exceptions.*.lesson_hour_ids' => 'nullable|array',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::findOrFail($validated['class_group_id']);
            $refDate = Carbon::parse($validated['date']);

            // Tentukan daftar hari KBM yang diproses
            $targetDays = [];
            if ($validated['mode'] === 'daily') {
                // Hari dari tanggal yang dipilih (1=Senin..7=Ahad)
                $isoDay = $refDate->dayOfWeekIso; // 1=Mon .. 7=Sun
                // Konversi ke format hari sistem pesantren (6=Sabtu, 7=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis)
                $targetDays = [$isoDay == 6 ? 6 : ($isoDay == 7 ? 7 : $isoDay)];
            } elseif ($validated['mode'] === 'weekly') {
                // Seluruh hari belajar aktif di pesantren (Sabtu s.d. Kamis)
                $targetDays = [6, 7, 1, 2, 3, 4];
            } elseif ($validated['mode'] === 'custom_days') {
                $targetDays = $validated['days'] ?? [6];
            }

            // Dapatkan seluruh santri aktif di rombel ini
            $activeStudents = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->pluck('student_id');

            if ($activeStudents->isEmpty()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Tidak ada santri aktif di rombel ini.',
                ], 422);
            }

            // Siapkan peta pengecualian (santri yang sakit, izin, alpa)
            $exceptionsMap = [];
            foreach ($validated['exceptions'] ?? [] as $exc) {
                $exceptionsMap[$exc['student_id']] = $exc;
            }

            $academicYearId = $classGroup->academic_year_id ?? 1;
            $journalsCreated = 0;
            $presencesCreated = 0;

            // Loop setiap hari yang diproses
            foreach ($targetDays as $dayId) {
                // Ambil jadwal pelajaran aktif untuk rombel di hari ini
                $schedules = LessonSchedule::where('class_group_id', $classGroup->id)
                    ->where('day', $dayId)
                    ->with('lessonHour')
                    ->get();

                if ($schedules->isEmpty()) {
                    continue;
                }

                // Hitung tanggal riil untuk hari tersebut relatif terhadap pekan refDate
                // (Sabtu awal pekan sampai Kamis akhir pekan)
                $currentDayOfWeek = $refDate->dayOfWeekIso; // 1=Mon..7=Sun
                // Kita gunakan tanggal refDate jika daily, atau hitung offset jika weekly
                $kbmDate = $validated['mode'] === 'daily' 
                    ? $refDate->format('Y-m-d')
                    : $refDate->copy()->startOfWeek(Carbon::SATURDAY)->addDays(($dayId == 6 ? 0 : ($dayId == 7 ? 1 : $dayId + 1)))->format('Y-m-d');

                // Loop setiap jadwal KBM (misal Jam 1 s.d Jam 6)
                foreach ($schedules as $sched) {
                    // Cari atau buat jurnal untuk sesi ini
                    $journal = TeachingJournal::firstOrCreate(
                        [
                            'class_group_id'     => $classGroup->id,
                            'study_id'           => $sched->study_id,
                            'date'               => $kbmDate,
                            'lesson_schedule_id' => $sched->id,
                        ],
                        [
                            'academic_year_id' => $academicYearId,
                            'teacher_id'       => $sched->teacher_id,
                            'meeting_number'   => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                            'topic'            => 'KBM Terjadwal Jam Ke-' . ($sched->lessonHour->order ?? 1),
                            'notes'            => 'Presensi massal sistem terpadu',
                            'teacher_status'   => 'hadir',
                        ]
                    );

                    $journalsCreated++;

                    // Catat presensi untuk seluruh santri aktif
                    foreach ($activeStudents as $studentId) {
                        $status = 'hadir'; // DEFAULT: SELALU HADIR
                        $notes = null;

                        // Cek apakah santri ini memiliki status pengecualian
                        if (isset($exceptionsMap[$studentId])) {
                            $exc = $exceptionsMap[$studentId];
                            $applies = true;

                            if (($exc['scope'] ?? 'all') === 'selected') {
                                $targetHours = $exc['lesson_hour_ids'] ?? [];
                                if (!in_array($sched->lesson_hour_id, $targetHours)) {
                                    $applies = false;
                                }
                            }

                            if ($applies) {
                                $status = $exc['status'];
                                $notes  = $exc['notes'] ?? null;
                            }
                        }

                        StudentPresence::updateOrCreate(
                            [
                                'teaching_journal_id' => $journal->id,
                                'student_id'          => $studentId,
                            ],
                            [
                                'status' => $status,
                                'notes'  => $notes,
                            ]
                        );

                        $presencesCreated++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Presensi massal berhasil disimpan! ($journalsCreated sesi KBM, $presencesCreated catatan kehadiran)",
                'data'    => [
                    'journals_count'  => $journalsCreated,
                    'presences_count' => $presencesCreated,
                    'class_group_id'  => $classGroup->id,
                    'mode'            => $validated['mode'],
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing batch presence: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses presensi massal: ' . $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Ambil Grid Presensi Harian Berdasarkan Jam Pelajaran (Jam Ke-1 s.d Jam Ke-6)
     * Mengembalikan susunan mata pelajaran per jam untuk tanggal yang dipilih
     * serta status kehadiran santri pada setiap jam (default: hadir).
     */
    public function dayGrid(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'date'           => 'required|date',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear'
            ])->findOrFail($validated['class_group_id']);

            $refDate = Carbon::parse($validated['date']);
            $isoDay = $refDate->dayOfWeekIso; // 1=Mon .. 7=Sun
            // Format hari: 6=Sabtu, 7=Ahad, 1=Senin, 2=Selasa, 3=Rabu, 4=Kamis
            $dayNumber = $isoDay;

            $dayNames = [
                6 => 'Sabtu',
                7 => 'Ahad',
                1 => 'Senin',
                2 => 'Selasa',
                3 => 'Rabu',
                4 => 'Kamis',
                5 => 'Jumat'
            ];
            $dayName = $dayNames[$dayNumber] ?? 'Hari Belajar';

            // Ambil seluruh jadwal aktif rombel untuk hari tersebut urut berdasarkan jam (order)
            $schedules = LessonSchedule::with(['lessonHour', 'study', 'teacher'])
                ->where('class_group_id', $classGroup->id)
                ->where('day', $dayNumber)
                ->where('is_active', true)
                ->get()
                ->sortBy(fn($s) => $s->lessonHour->order ?? 0)
                ->values();

            // Format daftar jam pelajaran hari ini
            $hours = [];
            foreach ($schedules as $sched) {
                $hours[] = [
                    'schedule_id'    => $sched->id,
                    'hour_id'        => $sched->lesson_hour_id,
                    'order'          => $sched->lessonHour->order ?? 1,
                    'hour_name'      => $sched->lessonHour->name ?? ('Jam Ke-' . ($sched->lessonHour->order ?? 1)),
                    'time'           => substr($sched->lessonHour->start_time ?? '07:00', 0, 5) . ' - ' . substr($sched->lessonHour->end_time ?? '08:30', 0, 5),
                    'study_id'       => $sched->study_id,
                    'study_name'     => $sched->study->name ?? 'Mata Pelajaran',
                    'study_code'     => $sched->study->code ?? '',
                    'teacher_id'     => $sched->teacher_id,
                    'teacher_name'   => $sched->teacher->name ?? '-',
                ];
            }

            // Ambil jurnal yang sudah ada pada tanggal & rombel ini
            $existingJournals = TeachingJournal::with('presences')
                ->where('class_group_id', $classGroup->id)
                ->whereDate('date', $refDate->format('Y-m-d'))
                ->get()
                ->keyBy('lesson_schedule_id');

            // Ambil santri aktif
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get()
                ->sortBy(fn($sc) => $sc->student->name ?? '')
                ->values();

            // Susun baris santri x jam pelajaran
            $studentRows = [];
            foreach ($students as $sc) {
                $st = $sc->student;
                $attendances = [];

                foreach ($hours as $h) {
                    $order = $h['order'];
                    $schedId = $h['schedule_id'];
                    $status = 'hadir'; // DEFAULT: SELALU HADIR
                    $notes  = null;

                    if ($existingJournals->has($schedId)) {
                        $j = $existingJournals->get($schedId);
                        $presence = $j->presences->firstWhere('student_id', $st->id);
                        if ($presence) {
                            $status = $presence->status;
                            $notes  = $presence->notes;
                        }
                    }

                    $attendances[$order] = [
                        'schedule_id' => $schedId,
                        'study_id'    => $h['study_id'],
                        'status'      => $status,
                        'notes'       => $notes,
                    ];
                }

                $studentRows[] = [
                    'student_id'   => $st->id,
                    'nis'          => $st->nis,
                    'name'         => $st->name,
                    'gender'       => $st->gender,
                    'attendances'  => $attendances,
                ];
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Grid presensi harian berhasil dimuat',
                'data'    => [
                    'date'        => $refDate->format('Y-m-d'),
                    'day_number'  => $dayNumber,
                    'day_name'    => $dayName,
                    'class_group' => [
                        'id'               => $classGroup->id,
                        'name'             => $classGroup->name,
                        'academic_year'    => $classGroup->academicYear->name ?? '1446/1447 H',
                        'program'          => $classGroup->program->name ?? '',
                        'education'        => $classGroup->education->name ?? '',
                        'education_class'  => $classGroup->educationClass->name ?? '',
                        'homeroom_teacher' => $classGroup->homeroomTeacher->name ?? '',
                    ],
                    'hours'       => $hours,
                    'students'    => $studentRows,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading day grid presence: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat grid presensi harian: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simpan Grid Presensi Harian Berdasarkan Jam Pelajaran
     * Memproses kehadiran per jam dan per mata pelajaran secara akurat.
     */
    public function saveDayGrid(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'date'           => 'required|date',
            'grid'           => 'required|array',
            'grid.*.student_id' => 'required|exists:students,id',
            'grid.*.attendances' => 'required|array',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::findOrFail($validated['class_group_id']);
            $refDate = Carbon::parse($validated['date']);
            $academicYearId = $classGroup->academic_year_id ?? 1;

            // Dapatkan seluruh jadwal aktif untuk rombel ini di hari tersebut
            $isoDay = $refDate->dayOfWeekIso;
            $schedules = LessonSchedule::where('class_group_id', $classGroup->id)
                ->where('day', $isoDay)
                ->with(['lessonHour', 'study'])
                ->get()
                ->keyBy('lesson_hour_id');

            // Petakan jurnal per schedule
            $journalCache = [];

            foreach ($validated['grid'] as $studentRow) {
                $studentId = $studentRow['student_id'];

                foreach ($studentRow['attendances'] as $order => $att) {
                    $schedId = $att['schedule_id'] ?? null;
                    $status  = $att['status'] ?? 'hadir';
                    $notes   = $att['notes'] ?? null;

                    if (!$schedId) {
                        continue;
                    }

                    // Ambil atau buat jurnal untuk sesi jadwal ini
                    if (!isset($journalCache[$schedId])) {
                        $sched = LessonSchedule::with('lessonHour')->find($schedId);
                        if (!$sched) continue;

                        $journal = TeachingJournal::firstOrCreate(
                            [
                                'class_group_id'     => $classGroup->id,
                                'study_id'           => $sched->study_id,
                                'date'               => $refDate->format('Y-m-d'),
                                'lesson_schedule_id' => $sched->id,
                            ],
                            [
                                'academic_year_id' => $academicYearId,
                                'teacher_id'       => $sched->teacher_id,
                                'meeting_number'   => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                                'topic'            => 'KBM Jam Ke-' . ($sched->lessonHour->order ?? $order),
                                'notes'            => 'Presensi harian terintegrasi jam pelajaran',
                                'teacher_status'   => 'hadir',
                            ]
                        );
                        $journalCache[$schedId] = $journal;
                    }

                    $journal = $journalCache[$schedId];

                    StudentPresence::updateOrCreate(
                        [
                            'teaching_journal_id' => $journal->id,
                            'student_id'          => $studentId,
                        ],
                        [
                            'status' => $status,
                            'notes'  => $notes,
                        ]
                    );
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => 'Presensi harian berdasarkan jam pelajaran berhasil disimpan!',
                'data'    => [
                    'date'           => $refDate->format('Y-m-d'),
                    'class_group_id' => $classGroup->id,
                    'journals_count' => count($journalCache),
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving day grid presence: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan presensi harian: ' . $e->getMessage(),
            ], 500);
        }
    }


    /**
     * Ambil Grid Presensi untuk Rentang Hari Berurutan (Multi-Day / Sepekan Sabtu s.d. Kamis)
     * Mengembalikan data jadwal jam dan status kehadiran seluruh santri untuk setiap hari dalam rentang.
     */
    public function rangeGrid(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'start_date'     => 'required|date',
            'end_date'       => 'required|date|after_or_equal:start_date',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear'
            ])->findOrFail($validated['class_group_id']);

            $startDate = Carbon::parse($validated['start_date']);
            $endDate   = Carbon::parse($validated['end_date']);

            // Batasi rentang maksimal 14 hari agar performa tetap ringan
            if ($startDate->diffInDays($endDate) > 14) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Rentang hari maksimal adalah 14 hari.',
                ], 422);
            }

            $dayNames = [
                6 => 'Sabtu',
                7 => 'Ahad',
                1 => 'Senin',
                2 => 'Selasa',
                3 => 'Rabu',
                4 => 'Kamis',
                5 => 'Jumat'
            ];

            // Ambil seluruh santri aktif
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get()
                ->sortBy(fn($sc) => $sc->student->name ?? '')
                ->values();

            $daysResult = [];
            $cur = $startDate->copy();

            while ($cur->lte($endDate)) {
                $isoDay = $cur->dayOfWeekIso; // 1=Mon .. 7=Sun
                $dayName = $dayNames[$isoDay] ?? 'Hari Belajar';
                $curDateStr = $cur->format('Y-m-d');

                // Jadwal pada hari tersebut
                $schedules = LessonSchedule::with(['lessonHour', 'study', 'teacher'])
                    ->where('class_group_id', $classGroup->id)
                    ->where('day', $isoDay)
                    ->where('is_active', true)
                    ->get()
                    ->sortBy(fn($s) => $s->lessonHour->order ?? 0)
                    ->values();

                // Format daftar jam pelajaran
                $hours = [];
                foreach ($schedules as $sched) {
                    $hours[] = [
                        'schedule_id'  => $sched->id,
                        'hour_id'      => $sched->lesson_hour_id,
                        'order'        => $sched->lessonHour->order ?? 1,
                        'hour_name'    => $sched->lessonHour->name ?? ('Jam Ke-' . ($sched->lessonHour->order ?? 1)),
                        'time'         => substr($sched->lessonHour->start_time ?? '07:00', 0, 5) . ' - ' . substr($sched->lessonHour->end_time ?? '08:30', 0, 5),
                        'study_id'     => $sched->study_id,
                        'study_name'   => $sched->study->name ?? 'Mata Pelajaran',
                        'study_code'   => $sched->study->code ?? '',
                        'teacher_id'   => $sched->teacher_id,
                        'teacher_name' => $sched->teacher->name ?? '-',
                    ];
                }

                // Ambil jurnal yang sudah ada pada tanggal ini
                $existingJournals = TeachingJournal::with('presences')
                    ->where('class_group_id', $classGroup->id)
                    ->whereDate('date', $curDateStr)
                    ->get()
                    ->keyBy('lesson_schedule_id');

                // Susun baris santri untuk hari ini
                $studentRows = [];
                foreach ($students as $sc) {
                    $st = $sc->student;
                    $attendances = [];

                    foreach ($hours as $h) {
                        $order = $h['order'];
                        $schedId = $h['schedule_id'];
                        $status = 'hadir'; // DEFAULT SELALU HADIR
                        $notes  = null;

                        if ($existingJournals->has($schedId)) {
                            $j = $existingJournals->get($schedId);
                            $presence = $j->presences->firstWhere('student_id', $st->id);
                            if ($presence) {
                                $status = $presence->status;
                                $notes  = $presence->notes;
                            }
                        }

                        $attendances[$order] = [
                            'schedule_id' => $schedId,
                            'study_id'    => $h['study_id'],
                            'status'      => $status,
                            'notes'       => $notes,
                        ];
                    }

                    $studentRows[] = [
                        'student_id'   => $st->id,
                        'nis'          => $st->nis,
                        'name'         => $st->name,
                        'gender'       => $st->gender,
                        'attendances'  => $attendances,
                    ];
                }

                $daysResult[] = [
                    'date'        => $curDateStr,
                    'day_number'  => $isoDay,
                    'day_name'    => $dayName,
                    'hours_count' => count($hours),
                    'hours'       => $hours,
                    'students'    => $studentRows,
                ];

                $cur->addDay();
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Grid rentang hari berhasil dimuat',
                'data'    => [
                    'class_group' => [
                        'id'               => $classGroup->id,
                        'name'             => $classGroup->name,
                        'academic_year'    => $classGroup->academicYear->name ?? '1446/1447 H',
                        'program'          => $classGroup->program->name ?? '',
                        'education'        => $classGroup->education->name ?? '',
                        'education_class'  => $classGroup->educationClass->name ?? '',
                        'homeroom_teacher' => $classGroup->homeroomTeacher->name ?? '',
                    ],
                    'start_date'  => $startDate->format('Y-m-d'),
                    'end_date'    => $endDate->format('Y-m-d'),
                    'total_days'  => count($daysResult),
                    'days'        => $daysResult,
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading range grid: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat grid rentang hari: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Simpan Presensi Sekaligus untuk Rentang Hari Berurutan (Multi-Day / Sepekan Kamis)
     */
    public function saveMultiDayGrid(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'days'           => 'required|array',
            'days.*.date'    => 'required|date',
            'days.*.grid'    => 'required|array',
            'days.*.grid.*.student_id' => 'required|exists:students,id',
            'days.*.grid.*.attendances' => 'required|array',
        ]);

        try {
            DB::beginTransaction();

            $classGroup = ClassGroup::findOrFail($validated['class_group_id']);
            $academicYearId = $classGroup->academic_year_id ?? 1;

            $totalJournalsSaved = 0;
            $totalPresencesSaved = 0;

            foreach ($validated['days'] as $dayItem) {
                $curDate = Carbon::parse($dayItem['date']);
                $dateStr = $curDate->format('Y-m-d');
                $isoDay  = $curDate->dayOfWeekIso;

                $journalCache = [];

                foreach ($dayItem['grid'] as $studentRow) {
                    $studentId = $studentRow['student_id'];

                    foreach ($studentRow['attendances'] as $order => $att) {
                        $schedId = $att['schedule_id'] ?? null;
                        $status  = $att['status'] ?? 'hadir';
                        $notes   = $att['notes'] ?? null;

                        if (!$schedId) continue;

                        if (!isset($journalCache[$schedId])) {
                            $sched = LessonSchedule::with('lessonHour')->find($schedId);
                            if (!$sched) continue;

                            $journal = TeachingJournal::firstOrCreate(
                                [
                                    'class_group_id'     => $classGroup->id,
                                    'study_id'           => $sched->study_id,
                                    'date'               => $dateStr,
                                    'lesson_schedule_id' => $sched->id,
                                ],
                                [
                                    'academic_year_id' => $academicYearId,
                                    'teacher_id'       => $sched->teacher_id,
                                    'meeting_number'   => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                                    'topic'            => 'KBM Jam Ke-' . ($sched->lessonHour->order ?? $order),
                                    'notes'            => 'Presensi terintegrasi jadwal mingguan',
                                    'teacher_status'   => 'hadir',
                                ]
                            );
                            $journalCache[$schedId] = $journal;
                            $totalJournalsSaved++;
                        }

                        $journal = $journalCache[$schedId];

                        StudentPresence::updateOrCreate(
                            [
                                'teaching_journal_id' => $journal->id,
                                'student_id'          => $studentId,
                            ],
                            [
                                'status' => $status,
                                'notes'  => $notes,
                            ]
                        );
                        $totalPresencesSaved++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Presensi sepekan berhasil disimpan! ($totalJournalsSaved sesi KBM, $totalPresencesSaved catatan presensi santri)",
                'data'    => [
                    'journals_count'  => $totalJournalsSaved,
                    'presences_count' => $totalPresencesSaved,
                ]
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving multi-day grid: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan presensi rentang hari: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Daftar Jurnal KBM yang terhubung ke presensi hari (untuk tab Jurnal Mengajar)
     * Menampilkan status presensi santri pada sesi pertemuan tersebut.
     */
    public function listWithPresenceSummary(Request $request)
    {
        try {
            $query = TeachingJournal::with([
                'classGroup',
                'study',
                'teacher',
                'lessonSchedule.lessonHour',
                'presences.student'
            ])->withCount([
                'presences as hadir_count' => function ($q) { $q->where('status', 'hadir'); },
                'presences as sakit_count' => function ($q) { $q->where('status', 'sakit'); },
                'presences as izin_count'  => function ($q) { $q->where('status', 'izin'); },
                'presences as alpa_count'  => function ($q) { $q->where('status', 'alpa'); },
                'presences as total_presented'
            ]);

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            $journals = $query->orderBy('date', 'desc')->orderBy('meeting_number', 'desc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Daftar jurnal dengan rekapitulasi kehadiran berhasil diambil',
                'data'    => $journals,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error listing journals with presence summary: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data: ' . $e->getMessage(),
            ], 500);
        }
    }

}
