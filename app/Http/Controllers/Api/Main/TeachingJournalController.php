<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\LessonSchedule;
use App\Models\StudentClass;
use App\Models\StudentPresence;
use App\Models\Study;
use App\Models\TeachingJournal;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class TeachingJournalController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:presensi.create|presensi.update', only: ['saveMultiDayGrid', 'saveDayGrid', 'batchPresence', 'updatePresences']),
            new Middleware('permission:kbm.create', only: ['store']),
            new Middleware('permission:kbm.update', only: ['update']),
            new Middleware('permission:kbm.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            $query = TeachingJournal::with([
                'classGroup',
                'study',
                'teacher',
                'substituteTeacher',
                'lessonSchedule',
                'presences',
            ])->withCount([
                'presences as hadir_count' => function ($q) {
                    $q->where('status', 'hadir');
                },
                'presences as sakit_count' => function ($q) {
                    $q->where('status', 'sakit');
                },
                'presences as izin_count' => function ($q) {
                    $q->where('status', 'izin');
                },
                'presences as alpa_count' => function ($q) {
                    $q->where('status', 'alpa');
                },
            ]);

            if ($userProgramId) {
                $query->whereHas('classGroup', fn ($cg) => $cg->where('program_id', $userProgramId));
            }

            $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
            if ($targetYearId) {
                $query->where('academic_year_id', $targetYearId);
            }

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
                'status' => 'success',
                'message' => 'Data jurnal KBM berhasil diambil',
                'data' => $journals,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving teaching journals: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil jurnal KBM',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'academic_year_id' => 'required|exists:academic_years,id',
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id' => 'required|exists:studies,id',
            'teacher_id' => 'required|exists:teachers,id',
            'lesson_schedule_id' => 'nullable|exists:lesson_schedules,id',
            'meeting_number' => 'required|integer|min:1',
            'date' => 'required|date',
            'start_time' => 'nullable|date_format:H:i',
            'end_time' => 'nullable|date_format:H:i',
            'topic' => 'required|string|max:255',
            'notes' => 'nullable|string',
            'teacher_status' => 'nullable|in:hadir,izin,tugas,digantikan',
            'substitute_teacher_id' => 'nullable|exists:teachers,id',
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
                    'student_id' => $sc->student_id,
                    'status' => 'hadir',
                    'notes' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }

            if (! empty($presences)) {
                StudentPresence::insert($presences);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Jurnal KBM berhasil dibuka dan presensi disiapkan',
                'data' => $journal->load(['classGroup', 'study', 'teacher', 'presences.student']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating teaching journal: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuka jurnal KBM: '.$e->getMessage(),
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
            'presences.student',
        ])->find($id);

        if (! $journal) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail jurnal KBM berhasil diambil',
            'data' => $journal,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $journal = TeachingJournal::find($id);

        if (! $journal) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'meeting_number' => 'sometimes|required|integer|min:1',
            'date' => 'sometimes|required|date',
            'topic' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
            'teacher_status' => 'nullable|in:hadir,izin,tugas,digantikan',
            'substitute_teacher_id' => 'nullable|exists:teachers,id',
        ]);

        try {
            $journal->update($validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Jurnal KBM berhasil diperbarui',
                'data' => $journal->fresh(['classGroup', 'study', 'teacher']),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error updating teaching journal: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui jurnal KBM',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $journal = TeachingJournal::find($id);

        if (! $journal) {
            return response()->json([
                'status' => 'error',
                'message' => 'Jurnal KBM tidak ditemukan',
            ], 404);
        }

        try {
            $journal->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Jurnal KBM berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting teaching journal: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
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
            'presences' => 'required|array',
            'presences.*.student_id' => 'required|exists:students,id',
            'presences.*.status' => 'required|in:hadir,sakit,izin,alpa',
            'presences.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['presences'] as $item) {
                StudentPresence::updateOrCreate(
                    [
                        'teaching_journal_id' => $journal->id,
                        'student_id' => $item['student_id'],
                    ],
                    [
                        'status' => $item['status'],
                        'notes' => $item['notes'] ?? null,
                    ]
                );
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Presensi siswa berhasil disimpan',
                'data' => $journal->fresh('presences.student'),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating student presences: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui presensi siswa',
            ], 500);
        }
    }

    /**
     * Rekapitulasi absensi per rombel, mata pelajaran, dan rentang tanggal.
     */
    public function recap(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id' => 'nullable|exists:studies,id',
            'start_date' => 'nullable|date',
            'end_date' => array_filter([
                'nullable',
                'date',
                $request->filled('start_date') ? 'after_or_equal:start_date' : null,
            ]),
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'educationalInstitution.program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear',
            ])->findOrFail($validated['class_group_id']);

            $userProgramId = auth('api')->user()?->getActiveProgramId();
            $effectiveProgramId = $classGroup->program_id ?? $classGroup->educationalInstitution?->program_id;
            if ($userProgramId && $effectiveProgramId && (int) $effectiveProgramId !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki hak akses ke rekapitulasi rombel dari program lain.',
                ], 403);
            }

            $result = $this->computeRecapData($classGroup, $validated);

            return response()->json([
                'status' => 'success',
                'message' => 'Rekapitulasi presensi berhasil dihitung',
                'data' => [
                    'class_group' => $classGroup->name,
                    'start_date' => $validated['start_date'] ?? null,
                    'end_date' => $validated['end_date'] ?? null,
                    'total_meetings' => $result['total_meetings'],
                    'students' => $result['students'],
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error generating attendance recap: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghitung rekap presensi',
            ], 500);
        }
    }

    /**
     * Ekspor Rekapitulasi Kehadiran Santri ke file Excel (.xlsx) untuk semua waktu atau rentang tanggal tertentu.
     */
    public function exportRecap(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id' => 'nullable|exists:studies,id',
            'academic_year_id' => 'nullable|exists:academic_years,id',
            'academic_quarter_id' => 'nullable|exists:academic_quarters,id',
            'start_date' => 'nullable|date',
            'end_date' => array_filter([
                'nullable',
                'date',
                $request->filled('start_date') ? 'after_or_equal:start_date' : null,
            ]),
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'educationalInstitution.program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear',
            ])->findOrFail($validated['class_group_id']);

            $userProgramId = auth('api')->user()?->getActiveProgramId();
            $effectiveProgramId = $classGroup->program_id ?? $classGroup->educationalInstitution?->program_id;
            if ($userProgramId && $effectiveProgramId && (int) $effectiveProgramId !== $userProgramId) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Anda tidak memiliki hak akses untuk mengekspor rekapitulasi rombel dari program lain.',
                ], 403);
            }

            $recapResult = $this->computeRecapData($classGroup, $validated, true);
            $students = $recapResult['students'];
            $totalMeetings = $recapResult['total_meetings'];
            $journals = $recapResult['journals'];

            // Resolusi Tahun Akademik & Periode Triwulan
            $targetYearId = $validated['academic_year_id']
                ?? $request->header('X-Academic-Year-Id')
                ?? $classGroup->academic_year_id;
            $yearObj = $targetYearId
                ? AcademicYear::find($targetYearId)
                : ($classGroup->academicYear ?? AcademicYear::where('active', true)->first());
            $rawYear = trim((string) ($yearObj?->year ?? $yearObj?->name ?? ''));
            $yearLabel = $rawYear !== ''
                ? (preg_match('/\bH$/i', $rawYear) ? $rawYear : "{$rawYear} H")
                : '-';

            $targetQuarterId = $validated['academic_quarter_id']
                ?? $request->header('X-Academic-Quarter-Id');
            $quarterObj = $targetQuarterId
                ? AcademicQuarter::find($targetQuarterId)
                : ($targetYearId
                    ? (AcademicQuarter::where('academic_year_id', $targetYearId)->where('active', true)->first()
                        ?? AcademicQuarter::where('academic_year_id', $targetYearId)->latest('id')->first())
                    : AcademicQuarter::where('active', true)->first());
            $quarterLabel = $quarterObj?->name ?? '-';

            // Resolusi label cakupan waktu
            $startDate = ! empty($validated['start_date']) ? $validated['start_date'] : null;
            $endDate = ! empty($validated['end_date']) ? $validated['end_date'] : null;

            if ($startDate && $endDate) {
                if ($startDate === $endDate) {
                    $periodLabel = 'Tanggal '.Carbon::parse($startDate)->locale('id')->translatedFormat('d F Y');
                    $filePeriodSlug = Carbon::parse($startDate)->format('Ymd');
                } else {
                    $periodLabel = Carbon::parse($startDate)->locale('id')->translatedFormat('d F Y')
                        .' s/d '.Carbon::parse($endDate)->locale('id')->translatedFormat('d F Y');
                    $filePeriodSlug = Carbon::parse($startDate)->format('Ymd').'_sd_'.Carbon::parse($endDate)->format('Ymd');
                }
            } elseif ($startDate) {
                $periodLabel = 'Mulai '.Carbon::parse($startDate)->locale('id')->translatedFormat('d F Y');
                $filePeriodSlug = 'mulai_'.Carbon::parse($startDate)->format('Ymd');
            } elseif ($endDate) {
                $periodLabel = 'Sampai '.Carbon::parse($endDate)->locale('id')->translatedFormat('d F Y');
                $filePeriodSlug = 'sampai_'.Carbon::parse($endDate)->format('Ymd');
            } else {
                $periodLabel = 'Semua Waktu (Seluruh Pertemuan KBM)';
                $filePeriodSlug = 'Semua_Waktu';
            }

            $studyObj = ! empty($validated['study_id']) ? Study::find($validated['study_id']) : null;
            $studySuffix = $studyObj ? "  •  Mapel: {$studyObj->name}" : '';

            $rombelLabel = $classGroup->name.($classGroup->code ? " ({$classGroup->code})" : '');
            $programName = $classGroup->program?->name ?? $classGroup->educationalInstitution?->program?->name ?? '-';
            $instName = $classGroup->educationalInstitution?->name ?? $classGroup->education?->name ?? '-';
            $instProgramLabel = ($programName !== '-' && $instName !== '-')
                ? "{$instName} ({$programName})"
                : ($instName !== '-' ? $instName : $programName);
            $levelName = $classGroup->educationClass?->name ?? '-';
            $roomName = $classGroup->classroom?->name ?? '-';
            $levelRoomLabel = ($levelName !== '-' && $roomName !== '-')
                ? "{$levelName}  •  Ruang {$roomName}"
                : ($levelName !== '-' ? $levelName : ($roomName !== '-' ? "Ruang {$roomName}" : '-'));
            $waliLabel = $classGroup->homeroomTeacher?->name ?? '-';
            $studentCount = count($students);

            // Inisialisasi Workbook
            $spreadsheet = new Spreadsheet;
            $spreadsheet->getDefaultStyle()->getFont()->setName('Calibri')->setSize(10);
            $spreadsheet->getProperties()
                ->setCreator('e-Panyeppen Pro — SIM Akademik')
                ->setTitle("Rekapitulasi Kehadiran {$classGroup->name}")
                ->setSubject("Rekapitulasi Kehadiran Santri ({$periodLabel})");

            // ═══════════════════════════════════════════════════════════════
            // SHEET 1: REKAP KEHADIRAN SANTRI
            // ═══════════════════════════════════════════════════════════════
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Rekap Kehadiran');
            $sheet->getPageSetup()
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setOrientation(PageSetup::ORIENTATION_PORTRAIT)
                ->setFitToWidth(1)
                ->setFitToHeight(0)
                ->setHorizontalCentered(true);
            $sheet->getPageMargins()
                ->setTop(0.5)
                ->setBottom(0.5)
                ->setLeft(0.4)
                ->setRight(0.4);
            $sheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(12, 12);
            $sheet->getHeaderFooter()->setOddFooter('&L&8Dicetak dari SIM Akademik e-Panyeppen Pro&R&8Halaman &P dari &N');

            $colWidths = [
                'A' => 6,
                'B' => 16,
                'C' => 36,
                'D' => 11,
                'E' => 11,
                'F' => 11,
                'G' => 11,
                'H' => 15,
                'I' => 20,
            ];
            foreach ($colWidths as $col => $width) {
                $sheet->getColumnDimension($col)->setWidth($width);
            }

            // Kop Surat Resmi Pesantren (Baris 1-3)
            $sheet->mergeCells('A1:I1');
            $sheet->setCellValue('A1', 'PONDOK PESANTREN MIFTAHUL ULUM PANYEPPEN');
            $sheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 13, 'color' => ['rgb' => '093C30']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(1)->setRowHeight(22);

            $sheet->mergeCells('A2:I2');
            $sheet->setCellValue('A2', "BAGIAN PENDIDIKAN DAN PENGAJARAN (TARBIYAH WA TA'LIM)");
            $sheet->getStyle('A2')->applyFromArray([
                'font' => ['bold' => true, 'size' => 10.5, 'color' => ['rgb' => '1E293B']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(2)->setRowHeight(18);

            $sheet->mergeCells('A3:I3');
            $sheet->setCellValue('A3', 'Jl. Raya Panyeppen, Potoan Daya, Palengaan, Pamekasan, Jawa Timur 69362 | Website: panyeppen.id');
            $sheet->getStyle('A3:I3')->applyFromArray([
                'font' => ['size' => 8.5, 'color' => ['rgb' => '64748B']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'borders' => [
                    'bottom' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '093C30']],
                ],
            ]);
            $sheet->getRowDimension(3)->setRowHeight(17);
            $sheet->getRowDimension(4)->setRowHeight(8);

            // Judul & Subjudul Cakupan Waktu (Baris 5-6)
            $sheet->mergeCells('A5:I5');
            $sheet->setCellValue('A5', 'REKAPITULASI KEHADIRAN SANTRI');
            $sheet->getStyle('A5')->applyFromArray([
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '0F172A']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension(5)->setRowHeight(22);

            $sheet->mergeCells('A6:I6');
            $sheet->setCellValue('A6', "Tahun Akademik: {$yearLabel}  •  Periode: {$quarterLabel}  •  Cakupan Waktu: {$periodLabel}");
            $sheet->getStyle('A6:I6')->applyFromArray([
                'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => '093C30']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ECFDF5']],
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'A7F3D0']],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);
            $sheet->getRowDimension(6)->setRowHeight(20);
            $sheet->getRowDimension(7)->setRowHeight(8);

            // Kotak Informasi Rombel 2 Kolom (Baris 8-10)
            $metaRows = [
                8 => ['Rombel / Kelas', ": {$rombelLabel}", 'Wali Kelas', ": {$waliLabel}", false],
                9 => ['Lembaga / Program', ": {$instProgramLabel}", 'Rentang Waktu', ": {$periodLabel}", true],
                10 => ['Tingkat / Ruang', ": {$levelRoomLabel}", 'Total Pertemuan', ": {$totalMeetings} Sesi KBM  •  {$studentCount} Santri{$studySuffix}", false],
            ];
            foreach ($metaRows as $rNum => [$leftLabel, $leftVal, $rightLabel, $rightVal, $highlightRightVal]) {
                $sheet->mergeCells("A{$rNum}:B{$rNum}");
                $sheet->mergeCells("D{$rNum}:E{$rNum}");
                $sheet->mergeCells("F{$rNum}:I{$rNum}");

                $sheet->setCellValue("A{$rNum}", $leftLabel);
                $sheet->setCellValue("C{$rNum}", $leftVal);
                $sheet->setCellValue("D{$rNum}", $rightLabel);
                $sheet->setCellValue("F{$rNum}", $rightVal);

                $sheet->getRowDimension($rNum)->setRowHeight(20);
                $sheet->getStyle("A{$rNum}:B{$rNum}")->getFont()->setBold(true)->setSize(9.5)->getColor()->setRGB('475569');
                $sheet->getStyle("D{$rNum}:E{$rNum}")->getFont()->setBold(true)->setSize(9.5)->getColor()->setRGB('475569');
                $sheet->getStyle("C{$rNum}")->getFont()->setBold(true)->setSize(9.5)->getColor()->setRGB('0F172A');
                $sheet->getStyle("F{$rNum}:I{$rNum}")->getFont()->setBold(true)->setSize(9.5)->getColor()->setRGB($highlightRightVal ? '093C30' : '0F172A');
            }
            $sheet->getStyle('A8:I10')->applyFromArray([
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'F8FAFC']],
                'borders' => [
                    'outline' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    'horizontal' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E2E8F0']],
                ],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);
            $sheet->getRowDimension(11)->setRowHeight(8);

            // Header Tabel (Baris 12)
            $headers = [
                'A' => 'NO',
                'B' => 'NIS',
                'C' => 'NAMA LENGKAP SANTRI',
                'D' => 'HADIR',
                'E' => 'IZIN',
                'F' => 'SAKIT',
                'G' => 'ALPA',
                'H' => 'KEHADIRAN (%)',
                'I' => 'KETERANGAN',
            ];
            foreach ($headers as $col => $text) {
                $sheet->setCellValue("{$col}12", $text);
            }
            $sheet->getStyle('A12:I12')->applyFromArray([
                'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '093C30']],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '064E3B']],
                ],
            ]);
            $sheet->getStyle('C12')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $sheet->getRowDimension(12)->setRowHeight(28);
            $sheet->freezePane('A13');

            // Isi Baris Santri
            $dataStartRow = 13;
            $afterTableRow = $dataStartRow;

            if ($studentCount === 0) {
                $sheet->mergeCells("A{$dataStartRow}:I{$dataStartRow}");
                $sheet->setCellValue("A{$dataStartRow}", 'Belum ada data santri aktif pada rombel ini.');
                $sheet->getStyle("A{$dataStartRow}:I{$dataStartRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9.5, 'color' => ['rgb' => '64748B']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    ],
                ]);
                $sheet->getRowDimension($dataStartRow)->setRowHeight(28);
                $afterTableRow = $dataStartRow;
            } else {
                foreach ($students as $idx => $st) {
                    $rowNum = $dataStartRow + $idx;
                    $hadir = (int) ($st['hadir'] ?? 0);
                    $izin = (int) ($st['izin'] ?? 0);
                    $sakit = (int) ($st['sakit'] ?? 0);
                    $alpa = (int) ($st['alpa'] ?? 0);
                    $pct = (float) ($st['percentage'] ?? 0);

                    $sheet->setCellValue("A{$rowNum}", $idx + 1);
                    $sheet->setCellValueExplicit("B{$rowNum}", (string) ($st['nis'] ?: '-'), DataType::TYPE_STRING);
                    $sheet->setCellValue("C{$rowNum}", (string) ($st['name'] ?: '-'));
                    $sheet->setCellValueExplicit("D{$rowNum}", $hadir, DataType::TYPE_NUMERIC);
                    $sheet->setCellValueExplicit("E{$rowNum}", $izin, DataType::TYPE_NUMERIC);
                    $sheet->setCellValueExplicit("F{$rowNum}", $sakit, DataType::TYPE_NUMERIC);
                    $sheet->setCellValueExplicit("G{$rowNum}", $alpa, DataType::TYPE_NUMERIC);
                    $sheet->setCellValueExplicit("H{$rowNum}", round($pct / 100, 4), DataType::TYPE_NUMERIC);

                    if ($totalMeetings === 0) {
                        $predicate = 'Belum Ada Sesi KBM';
                        $predColor = '64748B';
                        $predItalic = true;
                        $needsAttention = false;
                    } elseif ($pct >= 95) {
                        $predicate = 'Sangat Baik';
                        $predColor = '047857';
                        $predItalic = false;
                        $needsAttention = false;
                    } elseif ($pct >= 85) {
                        $predicate = 'Baik';
                        $predColor = '0F766E';
                        $predItalic = false;
                        $needsAttention = false;
                    } elseif ($pct >= 75) {
                        $predicate = 'Cukup';
                        $predColor = 'B45309';
                        $predItalic = false;
                        $needsAttention = false;
                    } else {
                        $predicate = 'Perlu Pembinaan';
                        $predColor = 'BE123C';
                        $predItalic = false;
                        $needsAttention = true;
                    }
                    $sheet->setCellValue("I{$rowNum}", $predicate);

                    if ($idx % 2 === 1) {
                        $sheet->getStyle("A{$rowNum}:I{$rowNum}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('F8FAFC');
                    }

                    if ($alpa > 0) {
                        $sheet->getStyle("G{$rowNum}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('FFF1F2');
                    }

                    if ($needsAttention) {
                        $sheet->getStyle("H{$rowNum}:I{$rowNum}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('FFF1F2');
                    }

                    $sheet->getStyle("A{$rowNum}")->getFont()->getColor()->setRGB('64748B');
                    $sheet->getStyle("B{$rowNum}")->getFont()->getColor()->setRGB('334155');
                    $sheet->getStyle("C{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('0F172A');
                    $sheet->getStyle("D{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('047857');
                    $sheet->getStyle("E{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('1D4ED8');
                    $sheet->getStyle("F{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('B45309');
                    $sheet->getStyle("G{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('BE123C');
                    $sheet->getStyle("H{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB($pct >= 80 ? '047857' : 'BE123C');
                    $sheet->getStyle("I{$rowNum}")->getFont()->setBold(! $predItalic)->setItalic($predItalic)->getColor()->setRGB($predColor);

                    $sheet->getStyle("D{$rowNum}:G{$rowNum}")->getNumberFormat()->setFormatCode('#,##0');
                    $sheet->getStyle("H{$rowNum}")->getNumberFormat()->setFormatCode('0.0%');

                    $sheet->getRowDimension($rowNum)->setRowHeight(20);
                }

                $endDataRow = $dataStartRow + $studentCount - 1;
                $sheet->getStyle("A{$dataStartRow}:I{$endDataRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    ],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle("A{$dataStartRow}:B{$endDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("C{$dataStartRow}:C{$endDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("D{$dataStartRow}:I{$endDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                // Baris Ringkasan Total / Rata-Rata
                $summaryRow = $endDataRow + 1;
                $sheet->mergeCells("A{$summaryRow}:C{$summaryRow}");
                $sheet->setCellValue("A{$summaryRow}", 'TOTAL / RATA-RATA KEHADIRAN ROMBEL');
                $sheet->setCellValue("D{$summaryRow}", "=SUM(D{$dataStartRow}:D{$endDataRow})");
                $sheet->setCellValue("E{$summaryRow}", "=SUM(E{$dataStartRow}:E{$endDataRow})");
                $sheet->setCellValue("F{$summaryRow}", "=SUM(F{$dataStartRow}:F{$endDataRow})");
                $sheet->setCellValue("G{$summaryRow}", "=SUM(G{$dataStartRow}:G{$endDataRow})");
                $sheet->setCellValue("H{$summaryRow}", "=AVERAGE(H{$dataStartRow}:H{$endDataRow})");
                $sheet->setCellValue("I{$summaryRow}", "{$totalMeetings} Pertemuan KBM");

                $sheet->getStyle("A{$summaryRow}:I{$summaryRow}")->applyFromArray([
                    'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '093C30']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ECFDF5']],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'A7F3D0']],
                        'top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '093C30']],
                        'bottom' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '093C30']],
                    ],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $sheet->getStyle("A{$summaryRow}:C{$summaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle("D{$summaryRow}:I{$summaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("D{$summaryRow}:G{$summaryRow}")->getNumberFormat()->setFormatCode('#,##0');
                $sheet->getStyle("H{$summaryRow}")->getNumberFormat()->setFormatCode('0.0%');
                $sheet->getRowDimension($summaryRow)->setRowHeight(24);

                $afterTableRow = $summaryRow;
            }

            // Blok Catatan & Tanda Tangan Wali Kelas
            $sigStartRow = $afterTableRow + 2;
            $todayIndoLabel = now()->locale('id')->translatedFormat('d F Y');
            $exportedAtLabel = now()->locale('id')->translatedFormat('d F Y H:i');

            $sheet->mergeCells("A{$sigStartRow}:E{$sigStartRow}");
            $sheet->setCellValue("A{$sigStartRow}", 'Catatan:');
            $sheet->getStyle("A{$sigStartRow}")->getFont()->setBold(true)->setSize(8.5)->getColor()->setRGB('475569');

            $noteRow1 = $sigStartRow + 1;
            $sheet->mergeCells("A{$noteRow1}:E{$noteRow1}");
            $sheet->setCellValue("A{$noteRow1}", '• Persentase Kehadiran = (Jumlah Hadir / Total Pertemuan KBM pada cakupan waktu) × 100%.');
            $sheet->getStyle("A{$noteRow1}")->applyFromArray([
                'font' => ['size' => 8.5, 'color' => ['rgb' => '64748B']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            $noteRow2 = $sigStartRow + 2;
            $sheet->mergeCells("A{$noteRow2}:E{$noteRow2}");
            $sheet->setCellValue("A{$noteRow2}", "• Diekspor dari SIM Akademik e-Panyeppen Pro pada {$exportedAtLabel}.");
            $sheet->getStyle("A{$noteRow2}")->applyFromArray([
                'font' => ['size' => 8.5, 'color' => ['rgb' => '64748B']],
                'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            ]);

            $sheet->mergeCells("G{$sigStartRow}:I{$sigStartRow}");
            $sheet->setCellValue("G{$sigStartRow}", "Pamekasan, {$todayIndoLabel}");
            $sheet->getStyle("G{$sigStartRow}")->applyFromArray([
                'font' => ['size' => 9.5, 'color' => ['rgb' => '334155']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $sheet->mergeCells("G{$noteRow1}:I{$noteRow1}");
            $sheet->setCellValue("G{$noteRow1}", 'Wali Kelas,');
            $sheet->getStyle("G{$noteRow1}")->applyFromArray([
                'font' => ['size' => 9.5, 'color' => ['rgb' => '334155']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);

            $sheet->getRowDimension($sigStartRow)->setRowHeight(17);
            $sheet->getRowDimension($noteRow1)->setRowHeight(17);
            $sheet->getRowDimension($noteRow2)->setRowHeight(17);
            $sheet->getRowDimension($sigStartRow + 3)->setRowHeight(18);

            $sigNameRow = $sigStartRow + 4;
            $sheet->mergeCells("G{$sigNameRow}:I{$sigNameRow}");
            $sheet->setCellValue("G{$sigNameRow}", $waliLabel !== '-' ? $waliLabel : '( .................................... )');
            $sheet->getStyle("G{$sigNameRow}")->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 9.5,
                    'underline' => $waliLabel !== '-',
                    'color' => ['rgb' => '0F172A'],
                ],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $sheet->getRowDimension($sigNameRow)->setRowHeight(19);

            // ═══════════════════════════════════════════════════════════════
            // SHEET 2: DAFTAR SESI PERTEMUAN KBM
            // ═══════════════════════════════════════════════════════════════
            $journalSheet = $spreadsheet->createSheet();
            $journalSheet->setTitle('Daftar Sesi KBM');
            $journalSheet->getPageSetup()
                ->setPaperSize(PageSetup::PAPERSIZE_A4)
                ->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)
                ->setFitToWidth(1)
                ->setFitToHeight(0)
                ->setHorizontalCentered(true);
            $journalSheet->getPageMargins()
                ->setTop(0.5)
                ->setBottom(0.5)
                ->setLeft(0.4)
                ->setRight(0.4);
            $journalSheet->getPageSetup()->setRowsToRepeatAtTopByStartAndEnd(4, 4);
            $journalSheet->getHeaderFooter()->setOddFooter('&L&8Dicetak dari SIM Akademik e-Panyeppen Pro&R&8Halaman &P dari &N');

            $journalColWidths = [
                'A' => 6,
                'B' => 14,
                'C' => 11,
                'D' => 13,
                'E' => 18,
                'F' => 24,
                'G' => 24,
                'H' => 34,
                'I' => 10,
                'J' => 10,
                'K' => 10,
                'L' => 10,
            ];
            foreach ($journalColWidths as $col => $width) {
                $journalSheet->getColumnDimension($col)->setWidth($width);
            }

            $journalSheet->mergeCells('A1:L1');
            $journalSheet->setCellValue('A1', "DAFTAR SESI PERTEMUAN KBM — {$rombelLabel}");
            $journalSheet->getStyle('A1')->applyFromArray([
                'font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => '093C30']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $journalSheet->getRowDimension(1)->setRowHeight(24);

            $journalSheet->mergeCells('A2:L2');
            $journalSheet->setCellValue(
                'A2',
                "Tahun Akademik: {$yearLabel}  •  Periode: {$quarterLabel}  •  Cakupan Waktu: {$periodLabel}  •  Total: {$totalMeetings} Sesi"
            );
            $journalSheet->getStyle('A2')->applyFromArray([
                'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => '475569']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
            $journalSheet->getRowDimension(2)->setRowHeight(18);
            $journalSheet->getRowDimension(3)->setRowHeight(8);

            $journalHeaders = [
                'A' => 'NO',
                'B' => 'TANGGAL',
                'C' => 'HARI',
                'D' => 'PERTEMUAN',
                'E' => 'JAM KBM',
                'F' => 'MATA PELAJARAN',
                'G' => 'PENGAJAR',
                'H' => 'MATERI / POKOK BAHASAN',
                'I' => 'HADIR',
                'J' => 'IZIN',
                'K' => 'SAKIT',
                'L' => 'ALPA',
            ];
            foreach ($journalHeaders as $col => $text) {
                $journalSheet->setCellValue("{$col}4", $text);
            }
            $journalSheet->getStyle('A4:L4')->applyFromArray([
                'font' => ['bold' => true, 'size' => 9.5, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '093C30']],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '064E3B']],
                ],
            ]);
            $journalSheet->getStyle('F4:H4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
            $journalSheet->getRowDimension(4)->setRowHeight(26);
            $journalSheet->freezePane('A5');

            $dayMap = [
                1 => 'Senin',
                2 => 'Selasa',
                3 => 'Rabu',
                4 => 'Kamis',
                5 => 'Jumat',
                6 => 'Sabtu',
                7 => 'Ahad',
            ];

            $jStartRow = 5;
            if ($journals->isEmpty()) {
                $journalSheet->mergeCells("A{$jStartRow}:L{$jStartRow}");
                $journalSheet->setCellValue("A{$jStartRow}", 'Belum ada sesi pertemuan KBM yang tercatat pada cakupan waktu ini.');
                $journalSheet->getStyle("A{$jStartRow}:L{$jStartRow}")->applyFromArray([
                    'font' => ['italic' => true, 'size' => 9.5, 'color' => ['rgb' => '64748B']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    ],
                ]);
                $journalSheet->getRowDimension($jStartRow)->setRowHeight(26);
            } else {
                foreach ($journals as $jIdx => $j) {
                    $rowNum = $jStartRow + $jIdx;
                    $dateCarbon = $j->date ? Carbon::parse($j->date)->locale('id') : null;
                    $dateText = $dateCarbon ? $dateCarbon->translatedFormat('d M Y') : '-';
                    $dayText = $dateCarbon ? ($dayMap[$dateCarbon->dayOfWeekIso] ?? $dateCarbon->translatedFormat('l')) : '-';
                    $meetingText = 'Ke-'.($j->meeting_number ?? ($jIdx + 1));

                    $lessonHour = $j->lessonSchedule?->lessonHour;
                    $hourLabel = $lessonHour?->name ?: ($lessonHour?->order ? "Jam {$lessonHour->order}" : '');
                    if ($lessonHour?->start_time) {
                        $timeRange = substr((string) $lessonHour->start_time, 0, 5)
                            .($lessonHour->end_time ? ' - '.substr((string) $lessonHour->end_time, 0, 5) : '');
                        $hourLabel = $hourLabel !== '' ? "{$hourLabel} ({$timeRange})" : $timeRange;
                    } elseif ($hourLabel === '') {
                        $hourLabel = '-';
                    }

                    $teacherText = $j->teacher?->name ?? '-';
                    if ($j->substituteTeacher) {
                        $teacherText .= " (Pengganti: {$j->substituteTeacher->name})";
                    }

                    $journalSheet->setCellValue("A{$rowNum}", $jIdx + 1);
                    $journalSheet->setCellValue("B{$rowNum}", $dateText);
                    $journalSheet->setCellValue("C{$rowNum}", $dayText);
                    $journalSheet->setCellValue("D{$rowNum}", $meetingText);
                    $journalSheet->setCellValue("E{$rowNum}", $hourLabel);
                    $journalSheet->setCellValue("F{$rowNum}", $j->study?->name ?? '-');
                    $journalSheet->setCellValue("G{$rowNum}", $teacherText);
                    $journalSheet->setCellValue("H{$rowNum}", $j->topic ?: 'KBM Reguler');
                    $journalSheet->setCellValueExplicit("I{$rowNum}", (int) ($j->hadir_count ?? 0), DataType::TYPE_NUMERIC);
                    $journalSheet->setCellValueExplicit("J{$rowNum}", (int) ($j->izin_count ?? 0), DataType::TYPE_NUMERIC);
                    $journalSheet->setCellValueExplicit("K{$rowNum}", (int) ($j->sakit_count ?? 0), DataType::TYPE_NUMERIC);
                    $journalSheet->setCellValueExplicit("L{$rowNum}", (int) ($j->alpa_count ?? 0), DataType::TYPE_NUMERIC);

                    if ($jIdx % 2 === 1) {
                        $journalSheet->getStyle("A{$rowNum}:L{$rowNum}")->getFill()
                            ->setFillType(Fill::FILL_SOLID)
                            ->getStartColor()->setRGB('F8FAFC');
                    }

                    $journalSheet->getStyle("A{$rowNum}")->getFont()->getColor()->setRGB('64748B');
                    $journalSheet->getStyle("F{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('0F172A');
                    $journalSheet->getStyle("I{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('047857');
                    $journalSheet->getStyle("J{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('1D4ED8');
                    $journalSheet->getStyle("K{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('B45309');
                    $journalSheet->getStyle("L{$rowNum}")->getFont()->setBold(true)->getColor()->setRGB('BE123C');
                    $journalSheet->getStyle("I{$rowNum}:L{$rowNum}")->getNumberFormat()->setFormatCode('#,##0');

                    $journalSheet->getRowDimension($rowNum)->setRowHeight(20);
                }

                $jEndRow = $jStartRow + $journals->count() - 1;
                $journalSheet->getStyle("A{$jStartRow}:L{$jEndRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']],
                    ],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                ]);
                $journalSheet->getStyle("A{$jStartRow}:E{$jEndRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $journalSheet->getStyle("F{$jStartRow}:H{$jEndRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $journalSheet->getStyle("I{$jStartRow}:L{$jEndRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $jSummaryRow = $jEndRow + 1;
                $journalSheet->mergeCells("A{$jSummaryRow}:H{$jSummaryRow}");
                $journalSheet->setCellValue("A{$jSummaryRow}", "TOTAL KESELURUHAN ({$totalMeetings} SESI PERTEMUAN KBM)");
                $journalSheet->setCellValue("I{$jSummaryRow}", "=SUM(I{$jStartRow}:I{$jEndRow})");
                $journalSheet->setCellValue("J{$jSummaryRow}", "=SUM(J{$jStartRow}:J{$jEndRow})");
                $journalSheet->setCellValue("K{$jSummaryRow}", "=SUM(K{$jStartRow}:K{$jEndRow})");
                $journalSheet->setCellValue("L{$jSummaryRow}", "=SUM(L{$jStartRow}:L{$jEndRow})");

                $journalSheet->getStyle("A{$jSummaryRow}:L{$jSummaryRow}")->applyFromArray([
                    'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '093C30']],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'ECFDF5']],
                    'borders' => [
                        'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'A7F3D0']],
                        'top' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '093C30']],
                        'bottom' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '093C30']],
                    ],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER],
                ]);
                $journalSheet->getStyle("A{$jSummaryRow}:H{$jSummaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $journalSheet->getStyle("I{$jSummaryRow}:L{$jSummaryRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $journalSheet->getStyle("I{$jSummaryRow}:L{$jSummaryRow}")->getNumberFormat()->setFormatCode('#,##0');
                $journalSheet->getRowDimension($jSummaryRow)->setRowHeight(24);
            }

            $spreadsheet->setActiveSheetIndex(0);

            $safeGroupName = preg_replace('/[^A-Za-z0-9_-]+/', '_', trim((string) $classGroup->name)) ?: 'Rombel';
            $filename = "Rekap_Kehadiran_{$safeGroupName}_{$filePeriodSlug}.xlsx";

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error exporting attendance recap to Excel: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengekspor rekapitulasi kehadiran ke Excel: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Hitung dataset rekapitulasi kehadiran rombel (dipakai bersama oleh recap JSON & export Excel).
     */
    private function computeRecapData(ClassGroup $classGroup, array $validated, bool $withJournalDetails = false): array
    {
        $students = StudentClass::where('class_group_id', $classGroup->id)
            ->where('status', 'aktif')
            ->with('student')
            ->get()
            ->filter(fn ($sc) => $sc->student !== null)
            ->sortBy(fn ($sc) => $sc->student->name ?? '')
            ->values();

        $journalsQuery = TeachingJournal::where('class_group_id', $classGroup->id);
        if (! empty($validated['study_id'])) {
            $journalsQuery->where('study_id', $validated['study_id']);
        }
        if (! empty($validated['start_date'])) {
            $journalsQuery->whereDate('date', '>=', $validated['start_date']);
        }
        if (! empty($validated['end_date'])) {
            $journalsQuery->whereDate('date', '<=', $validated['end_date']);
        }

        $journalIds = (clone $journalsQuery)->pluck('id');
        $totalMeetings = $journalIds->count();

        $presenceCounts = [];
        if ($journalIds->isNotEmpty()) {
            $rows = StudentPresence::whereIn('teaching_journal_id', $journalIds)
                ->selectRaw('student_id, LOWER(status) as status, COUNT(*) as total')
                ->groupBy('student_id', 'status')
                ->get();

            foreach ($rows as $row) {
                $presenceCounts[$row->student_id][$row->status] = (int) $row->total;
            }
        }

        $recapData = [];
        foreach ($students as $sc) {
            $sId = $sc->student_id;
            $counts = $presenceCounts[$sId] ?? [];
            $hadir = $counts['hadir'] ?? 0;
            $sakit = $counts['sakit'] ?? 0;
            $izin = $counts['izin'] ?? 0;
            $alpa = $counts['alpa'] ?? 0;

            $pct = $totalMeetings > 0 ? round(($hadir / $totalMeetings) * 100, 1) : 100;

            $recapData[] = [
                'student_id' => $sId,
                'name' => $sc->student->name,
                'nis' => $sc->student->nis,
                'hadir' => $hadir,
                'sakit' => $sakit,
                'izin' => $izin,
                'alpa' => $alpa,
                'percentage' => $pct,
            ];
        }

        $journals = collect();
        if ($withJournalDetails) {
            $journals = (clone $journalsQuery)
                ->with(['study', 'teacher', 'substituteTeacher', 'lessonSchedule.lessonHour'])
                ->withCount([
                    'presences as hadir_count' => fn ($q) => $q->whereRaw('LOWER(status) = ?', ['hadir']),
                    'presences as izin_count' => fn ($q) => $q->whereRaw('LOWER(status) = ?', ['izin']),
                    'presences as sakit_count' => fn ($q) => $q->whereRaw('LOWER(status) = ?', ['sakit']),
                    'presences as alpa_count' => fn ($q) => $q->whereRaw('LOWER(status) = ?', ['alpa']),
                ])
                ->orderBy('date', 'asc')
                ->orderBy('meeting_number', 'asc')
                ->get();
        }

        return [
            'total_meetings' => $totalMeetings,
            'students' => $recapData,
            'journals' => $journals,
        ];
    }

    /**
     * Lembar Presensi Matriks Pertemuan P1 - P16 (Sesuai Desain Lembar Presensi)
     */
    public function sheet(Request $request)
    {
        $validated = $request->validate([
            'class_group_id' => 'required|exists:class_groups,id',
            'study_id' => 'nullable|exists:studies,id',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear',
            ])->findOrFail($validated['class_group_id']);

            $study = ! empty($validated['study_id']) ? Study::find($validated['study_id']) : null;

            // Cari jadwal terkait untuk mata pelajaran ini jika ada
            $schedule = LessonSchedule::with(['teacher', 'lessonHour'])
                ->where('class_group_id', $classGroup->id)
                ->when($study, function ($q) use ($study) {
                    $q->where('study_id', $study->id);
                })
                ->first();

            // Dapatkan santri aktif di rombel
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get()
                ->sortBy(fn ($sc) => $sc->student->name ?? '')
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
                    'journal_id' => $j?->id,
                    'date' => $j?->date?->format('Y-m-d'),
                    'topic' => $j?->topic,
                    'is_recorded' => ! is_null($j),
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
                            $notes = $presence->notes;
                        }
                    }

                    $rowAttendances[$i] = [
                        'status' => $status,
                        'notes' => $notes,
                    ];
                }

                $sheetRows[] = [
                    'student_id' => $s->id,
                    'nis' => $s->nis,
                    'name' => $s->name,
                    'gender' => $s->gender,
                    'attendances' => $rowAttendances,
                ];
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Lembar presensi berhasil dimuat',
                'data' => [
                    'meta' => [
                        'academic_year' => $classGroup->academicYear?->name ?? '1446/1447 H',
                        'program' => $classGroup->program?->name ?? 'Kubar',
                        'education' => $classGroup->education?->name ?? 'Wustha',
                        'class_level' => $classGroup->educationClass?->name ?? 'Kelas 1',
                        'class_group' => $classGroup->name,
                        'study' => $study?->name ?? 'Semua Mata Pelajaran',
                        'teacher' => $schedule?->teacher?->name ?? $classGroup->homeroomTeacher?->name ?? '-',
                        'lesson_hour' => $schedule?->lessonHour ? ($schedule->lessonHour->start_time.' - '.$schedule->lessonHour->end_time) : '07:00 - 08:30',
                    ],
                    'meetings' => $meetings,
                    'students' => $sheetRows,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading attendance sheet: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat lembar presensi: '.$e->getMessage(),
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
            'mode' => 'required|in:daily,weekly,custom_days',
            'date' => 'required|date',
            'days' => 'nullable|array',
            'days.*' => 'integer|between:1,7',
            'exceptions' => 'nullable|array',
            'exceptions.*.student_id' => 'required|exists:students,id',
            'exceptions.*.status' => 'required|in:sakit,izin,alpa,hadir',
            'exceptions.*.notes' => 'nullable|string',
            'exceptions.*.scope' => 'nullable|in:all,selected',
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
                    'status' => 'error',
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
                            'class_group_id' => $classGroup->id,
                            'study_id' => $sched->study_id,
                            'date' => $kbmDate,
                            'lesson_schedule_id' => $sched->id,
                        ],
                        [
                            'academic_year_id' => $academicYearId,
                            'teacher_id' => $sched->teacher_id,
                            'meeting_number' => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                            'topic' => 'KBM Terjadwal Jam Ke-'.($sched->lessonHour->order ?? 1),
                            'notes' => 'Presensi massal sistem terpadu',
                            'teacher_status' => 'hadir',
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
                                if (! in_array($sched->lesson_hour_id, $targetHours)) {
                                    $applies = false;
                                }
                            }

                            if ($applies) {
                                $status = $exc['status'];
                                $notes = $exc['notes'] ?? null;
                            }
                        }

                        StudentPresence::updateOrCreate(
                            [
                                'teaching_journal_id' => $journal->id,
                                'student_id' => $studentId,
                            ],
                            [
                                'status' => $status,
                                'notes' => $notes,
                            ]
                        );

                        $presencesCreated++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Presensi massal berhasil disimpan! ($journalsCreated sesi KBM, $presencesCreated catatan kehadiran)",
                'data' => [
                    'journals_count' => $journalsCreated,
                    'presences_count' => $presencesCreated,
                    'class_group_id' => $classGroup->id,
                    'mode' => $validated['mode'],
                ],
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing batch presence: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memproses presensi massal: '.$e->getMessage(),
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
            'date' => 'required|date',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear',
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
                5 => 'Jumat',
            ];
            $dayName = $dayNames[$dayNumber] ?? 'Hari Belajar';

            // Ambil seluruh jadwal aktif rombel untuk hari tersebut urut berdasarkan jam (order)
            $schedules = LessonSchedule::with(['lessonHour', 'study', 'teacher'])
                ->where('class_group_id', $classGroup->id)
                ->where('day', $dayNumber)
                ->where('is_active', true)
                ->get()
                ->sortBy(fn ($s) => $s->lessonHour->order ?? 0)
                ->values();

            // Format daftar jam pelajaran hari ini
            $hours = [];
            foreach ($schedules as $sched) {
                $hours[] = [
                    'schedule_id' => $sched->id,
                    'hour_id' => $sched->lesson_hour_id,
                    'order' => $sched->lessonHour->order ?? 1,
                    'hour_name' => $sched->lessonHour->name ?? ('Jam Ke-'.($sched->lessonHour->order ?? 1)),
                    'time' => substr($sched->lessonHour->start_time ?? '07:00', 0, 5).' - '.substr($sched->lessonHour->end_time ?? '08:30', 0, 5),
                    'study_id' => $sched->study_id,
                    'study_name' => $sched->study->name ?? 'Mata Pelajaran',
                    'study_code' => $sched->study->code ?? '',
                    'teacher_id' => $sched->teacher_id,
                    'teacher_name' => $sched->teacher->name ?? '-',
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
                ->sortBy(fn ($sc) => $sc->student->name ?? '')
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
                    $notes = null;

                    if ($existingJournals->has($schedId)) {
                        $j = $existingJournals->get($schedId);
                        $presence = $j->presences->firstWhere('student_id', $st->id);
                        if ($presence) {
                            $status = $presence->status;
                            $notes = $presence->notes;
                        }
                    }

                    $attendances[$order] = [
                        'schedule_id' => $schedId,
                        'study_id' => $h['study_id'],
                        'status' => $status,
                        'notes' => $notes,
                    ];
                }

                $studentRows[] = [
                    'student_id' => $st->id,
                    'nis' => $st->nis,
                    'name' => $st->name,
                    'gender' => $st->gender,
                    'attendances' => $attendances,
                ];
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Grid presensi harian berhasil dimuat',
                'data' => [
                    'date' => $refDate->format('Y-m-d'),
                    'day_number' => $dayNumber,
                    'day_name' => $dayName,
                    'class_group' => [
                        'id' => $classGroup->id,
                        'name' => $classGroup->name,
                        'academic_year' => $classGroup->academicYear->name ?? '1446/1447 H',
                        'program' => $classGroup->program->name ?? '',
                        'education' => $classGroup->education->name ?? '',
                        'education_class' => $classGroup->educationClass->name ?? '',
                        'homeroom_teacher' => $classGroup->homeroomTeacher->name ?? '',
                    ],
                    'hours' => $hours,
                    'students' => $studentRows,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading day grid presence: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat grid presensi harian: '.$e->getMessage(),
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
            'date' => 'required|date',
            'grid' => 'required|array',
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
                    $status = $att['status'] ?? 'hadir';
                    $notes = $att['notes'] ?? null;

                    if (! $schedId) {
                        continue;
                    }

                    // Ambil atau buat jurnal untuk sesi jadwal ini
                    if (! isset($journalCache[$schedId])) {
                        $sched = LessonSchedule::with('lessonHour')->find($schedId);
                        if (! $sched) {
                            continue;
                        }

                        $journal = TeachingJournal::firstOrCreate(
                            [
                                'class_group_id' => $classGroup->id,
                                'study_id' => $sched->study_id,
                                'date' => $refDate->format('Y-m-d'),
                                'lesson_schedule_id' => $sched->id,
                            ],
                            [
                                'academic_year_id' => $academicYearId,
                                'teacher_id' => $sched->teacher_id,
                                'meeting_number' => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                                'topic' => 'KBM Jam Ke-'.($sched->lessonHour->order ?? $order),
                                'notes' => 'Presensi harian terintegrasi jam pelajaran',
                                'teacher_status' => 'hadir',
                            ]
                        );
                        $journalCache[$schedId] = $journal;
                    }

                    $journal = $journalCache[$schedId];

                    StudentPresence::updateOrCreate(
                        [
                            'teaching_journal_id' => $journal->id,
                            'student_id' => $studentId,
                        ],
                        [
                            'status' => $status,
                            'notes' => $notes,
                        ]
                    );
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Presensi harian berdasarkan jam pelajaran berhasil disimpan!',
                'data' => [
                    'date' => $refDate->format('Y-m-d'),
                    'class_group_id' => $classGroup->id,
                    'journals_count' => count($journalCache),
                ],
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving day grid presence: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan presensi harian: '.$e->getMessage(),
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
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        try {
            $classGroup = ClassGroup::with([
                'program',
                'education',
                'educationClass',
                'classroom',
                'homeroomTeacher',
                'academicYear',
            ])->findOrFail($validated['class_group_id']);

            $startDate = Carbon::parse($validated['start_date']);
            $endDate = Carbon::parse($validated['end_date']);

            // Batasi rentang maksimal 14 hari agar performa tetap ringan
            if ($startDate->diffInDays($endDate) > 14) {
                return response()->json([
                    'status' => 'error',
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
                5 => 'Jumat',
            ];

            // Ambil seluruh santri aktif
            $students = StudentClass::where('class_group_id', $classGroup->id)
                ->where('status', 'aktif')
                ->with('student')
                ->get()
                ->sortBy(fn ($sc) => $sc->student->name ?? '')
                ->values();

            $daysResult = [];
            $cur = $startDate->copy();

            while ($cur->lte($endDate)) {
                $isoDay = $cur->dayOfWeekIso; // 1=Mon .. 7=Sun
                $dayName = $dayNames[$isoDay] ?? 'Hari Belajar';
                $curDateStr = $cur->format('Y-m-d');

                $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
                $targetQuarterId = $request->query('academic_quarter_id') ?: $request->header('X-Academic-Quarter-Id');

                // Jadwal pada hari tersebut sesuai tahun akademik & triwulan
                $schedules = LessonSchedule::with(['lessonHour', 'study', 'teacher'])
                    ->where('class_group_id', $classGroup->id)
                    ->when($targetYearId, fn ($q) => $q->where('academic_year_id', $targetYearId))
                    ->when($targetQuarterId, fn ($q) => $q->where(function ($sub) use ($targetQuarterId) {
                        $sub->where('academic_quarter_id', $targetQuarterId)
                            ->orWhereNull('academic_quarter_id');
                    }))
                    ->where('day', $isoDay)
                    ->where('is_active', true)
                    ->get()
                    ->sortBy(fn ($s) => $s->lessonHour->order ?? 0)
                    ->values();

                // Format daftar jam pelajaran
                $hours = [];
                foreach ($schedules as $sched) {
                    $hours[] = [
                        'schedule_id' => $sched->id,
                        'hour_id' => $sched->lesson_hour_id,
                        'order' => $sched->lessonHour->order ?? 1,
                        'hour_name' => $sched->lessonHour->name ?? ('Jam Ke-'.($sched->lessonHour->order ?? 1)),
                        'time' => substr($sched->lessonHour->start_time ?? '07:00', 0, 5).' - '.substr($sched->lessonHour->end_time ?? '08:30', 0, 5),
                        'study_id' => $sched->study_id,
                        'study_name' => $sched->study->name ?? 'Mata Pelajaran',
                        'study_code' => $sched->study->code ?? '',
                        'teacher_id' => $sched->teacher_id,
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
                        $notes = null;

                        if ($existingJournals->has($schedId)) {
                            $j = $existingJournals->get($schedId);
                            $presence = $j->presences->firstWhere('student_id', $st->id);
                            if ($presence) {
                                $status = $presence->status;
                                $notes = $presence->notes;
                            }
                        }

                        $attendances[$order] = [
                            'schedule_id' => $schedId,
                            'study_id' => $h['study_id'],
                            'status' => $status,
                            'notes' => $notes,
                        ];
                    }

                    $studentRows[] = [
                        'student_id' => $st->id,
                        'nis' => $st->nis,
                        'name' => $st->name,
                        'gender' => $st->gender,
                        'attendances' => $attendances,
                    ];
                }

                $daysResult[] = [
                    'date' => $curDateStr,
                    'day_number' => $isoDay,
                    'day_name' => $dayName,
                    'hours_count' => count($hours),
                    'hours' => $hours,
                    'students' => $studentRows,
                ];

                $cur->addDay();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Grid rentang hari berhasil dimuat',
                'data' => [
                    'class_group' => [
                        'id' => $classGroup->id,
                        'name' => $classGroup->name,
                        'academic_year' => $classGroup->academicYear->name ?? '1446/1447 H',
                        'program' => $classGroup->program->name ?? '',
                        'education' => $classGroup->education->name ?? '',
                        'education_class' => $classGroup->educationClass->name ?? '',
                        'homeroom_teacher' => $classGroup->homeroomTeacher->name ?? '',
                    ],
                    'start_date' => $startDate->format('Y-m-d'),
                    'end_date' => $endDate->format('Y-m-d'),
                    'total_days' => count($daysResult),
                    'days' => $daysResult,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error loading range grid: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memuat grid rentang hari: '.$e->getMessage(),
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
            'days' => 'required|array',
            'days.*.date' => 'required|date',
            'days.*.grid' => 'required|array',
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
                $isoDay = $curDate->dayOfWeekIso;

                $journalCache = [];

                foreach ($dayItem['grid'] as $studentRow) {
                    $studentId = $studentRow['student_id'];

                    foreach ($studentRow['attendances'] as $order => $att) {
                        $schedId = $att['schedule_id'] ?? null;
                        $status = $att['status'] ?? 'hadir';
                        $notes = $att['notes'] ?? null;

                        if (! $schedId) {
                            continue;
                        }

                        if (! isset($journalCache[$schedId])) {
                            $sched = LessonSchedule::with('lessonHour')->find($schedId);
                            if (! $sched) {
                                continue;
                            }

                            $journal = TeachingJournal::firstOrCreate(
                                [
                                    'class_group_id' => $classGroup->id,
                                    'study_id' => $sched->study_id,
                                    'date' => $dateStr,
                                    'lesson_schedule_id' => $sched->id,
                                ],
                                [
                                    'academic_year_id' => $academicYearId,
                                    'teacher_id' => $sched->teacher_id,
                                    'meeting_number' => (TeachingJournal::where('class_group_id', $classGroup->id)->where('study_id', $sched->study_id)->count() + 1),
                                    'topic' => 'KBM Jam Ke-'.($sched->lessonHour->order ?? $order),
                                    'notes' => 'Presensi terintegrasi jadwal mingguan',
                                    'teacher_status' => 'hadir',
                                ]
                            );
                            $journalCache[$schedId] = $journal;
                            $totalJournalsSaved++;
                        }

                        $journal = $journalCache[$schedId];

                        StudentPresence::updateOrCreate(
                            [
                                'teaching_journal_id' => $journal->id,
                                'student_id' => $studentId,
                            ],
                            [
                                'status' => $status,
                                'notes' => $notes,
                            ]
                        );
                        $totalPresencesSaved++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Presensi sepekan berhasil disimpan! ($totalJournalsSaved sesi KBM, $totalPresencesSaved catatan presensi santri)",
                'data' => [
                    'journals_count' => $totalJournalsSaved,
                    'presences_count' => $totalPresencesSaved,
                ],
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error saving multi-day grid: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menyimpan presensi rentang hari: '.$e->getMessage(),
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
            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            $query = TeachingJournal::with([
                'classGroup',
                'study',
                'teacher',
                'lessonSchedule.lessonHour',
                'presences.student',
            ])->withCount([
                'presences as hadir_count' => function ($q) {
                    $q->where('status', 'hadir');
                },
                'presences as sakit_count' => function ($q) {
                    $q->where('status', 'sakit');
                },
                'presences as izin_count' => function ($q) {
                    $q->where('status', 'izin');
                },
                'presences as alpa_count' => function ($q) {
                    $q->where('status', 'alpa');
                },
                'presences as total_presented',
            ]);

            if ($userProgramId) {
                $query->whereHas('classGroup', fn ($cg) => $cg->where('program_id', $userProgramId));
            }

            $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
            if ($targetYearId) {
                $query->where('academic_year_id', $targetYearId);
            }

            if ($request->has('class_group_id')) {
                $query->where('class_group_id', $request->query('class_group_id'));
            }

            $journals = $query->orderBy('date', 'desc')->orderBy('meeting_number', 'desc')->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Daftar jurnal dengan rekapitulasi kehadiran berhasil diambil',
                'data' => $journals,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error listing journals with presence summary: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data: '.$e->getMessage(),
            ], 500);
        }
    }
}
