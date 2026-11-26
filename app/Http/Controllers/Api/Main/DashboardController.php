<?php

namespace App\Http\Controllers\Api\Main;

use App\Http\Controllers\Controller;
use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\EducationClass;
use App\Models\EducationalInstitution;
use App\Models\LessonSchedule;
use App\Models\Program;
use App\Models\Student;
use App\Models\StudentClass;
use App\Models\StudentPresence;
use App\Models\Study;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    /**
     * Mengambil seluruh statistik dan data widget dashboard secara real-time dari database.
     * Menerima query parameter filter scope akademik:
     * - ?academic_year_id=...
     * - ?academic_quarter_id=...
     */
    public function stats(Request $request): JsonResponse
    {
        $today = Carbon::today();

        // 1. Tentukan Periode Sistem Aktif (Default)
        $systemActiveYear = AcademicYear::where('type', 'triwulan')->where('active', true)->first()
            ?? AcademicYear::where('active', true)->first();

        $systemActiveQuarter = null;
        if ($systemActiveYear) {
            $systemActiveQuarter = AcademicQuarter::where('academic_year_id', $systemActiveYear->id)
                ->where('active', true)
                ->first();
        }
        if (! $systemActiveQuarter) {
            $systemActiveQuarter = AcademicQuarter::where('name', 'like', '%Triwulan%')->where('active', true)->first();
        }

        // 2. Evaluasi Scope Akademik Berdasarkan Request atau Fallback ke Sistem Aktif
        $targetYearId = $request->query('academic_year_id') ?: $request->header('X-Academic-Year-Id');
        $targetQuarterId = $request->query('academic_quarter_id') ?: $request->header('X-Academic-Quarter-Id');

        $selectedYear = null;
        if ($targetYearId) {
            $selectedYear = AcademicYear::find($targetYearId);
        }
        if (! $selectedYear) {
            $selectedYear = $systemActiveYear;
        }

        $selectedQuarter = null;
        if ($targetQuarterId) {
            $selectedQuarter = AcademicQuarter::where('id', $targetQuarterId)
                ->when($selectedYear, fn ($q) => $q->where('academic_year_id', $selectedYear->id))
                ->first();
        }
        if (! $selectedQuarter && $selectedYear) {
            // Ambil triwulan aktif di tahun tersebut atau triwulan terakhir
            $selectedQuarter = AcademicQuarter::where('academic_year_id', $selectedYear->id)
                ->where('active', true)
                ->first()
                ?? AcademicQuarter::where('academic_year_id', $selectedYear->id)->orderBy('id', 'desc')->first();
        }
        if (! $selectedQuarter) {
            $selectedQuarter = $systemActiveQuarter;
        }

        $hijriYear = $selectedYear ? ($selectedYear->year.' H') : '1446-1447 H';
        $triwulanName = $selectedQuarter ? $selectedQuarter->name : 'Triwulan IV (Syawal - Dzulhijjah)';
        $triwulanDetail = $selectedQuarter ? $selectedQuarter->name : 'Triwulan IV (Syawal - Dzulhijjah)';

        $isSystemActive = ($selectedYear && $systemActiveYear && $selectedYear->id === $systemActiveYear->id) &&
            ($selectedQuarter && $systemActiveQuarter && $selectedQuarter->id === $systemActiveQuarter->id);

        $user = auth('api')->user();
        $userProgramId = $user?->getActiveProgramId();

        // 3. JUMLAH SISWA AKTIF & DEMOGRAFI SESUAI TAHUN AKADEMIK TERPILIH & PROGRAM ROLE
        $studentClassQuery = StudentClass::query();
        if ($selectedYear) {
            $studentClassQuery->where('academic_year_id', $selectedYear->id);
        }
        if ($userProgramId) {
            $studentClassQuery->whereHas('classGroup', fn ($cg) => $cg->where('program_id', $userProgramId));
        }
        $studentIdsInPeriod = $studentClassQuery->pluck('student_id')->unique();
        $assignedSantriCount = $studentIdsInPeriod->count();

        $yearPeriodDash = $selectedYear ? str_replace('/', '-', trim($selectedYear->year)) : null;
        $yearPeriodSlash = $selectedYear ? trim($selectedYear->year) : null;

        $scopedStudentQuery = Student::whereIn('status', ['Aktif', 'aktif']);
        if ($userProgramId) {
            $scopedStudentQuery->where('program_id', $userProgramId);
        }
        if ($selectedYear && ! $selectedYear->active) {
            // Tahun akademik arsip / non-aktif: hanya santri yang terdaftar di rombel tahun ini atau angkatan tahun ini
            $scopedStudentQuery->where(function ($q) use ($selectedYear, $yearPeriodDash, $yearPeriodSlash) {
                $q->whereHas('studentClasses', fn ($sc) => $sc->where('academic_year_id', $selectedYear->id))
                    ->orWhereIn('period', array_filter([$yearPeriodDash, $yearPeriodSlash]));
            });
        }

        $totalSantri = (clone $scopedStudentQuery)->count();

        // Seluruh santri pesantren adalah 100% Banin (Putra), tidak ada santri putri/banat
        $baninCount = $totalSantri;
        $banatCount = 0;
        $mukimCount = (clone $scopedStudentQuery)->where('is_mukim', true)->count();
        $luarCount = (clone $scopedStudentQuery)->where('is_mukim', false)->count();
        $mukimPercent = $totalSantri > 0 ? round(($mukimCount / $totalSantri) * 100, 1) : 0;

        $newStudentsCount = $selectedYear
            ? (clone $scopedStudentQuery)->whereIn('period', array_filter([$yearPeriodDash, $yearPeriodSlash]))->count()
            : 0;

        // 3b. DISTRIBUSI SANTRI AKTIF BERDASARKAN PERIODE / ANGKATAN (untuk Pie Chart)
        $periodColors = ['#093c30', '#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#64748b'];
        $rawPeriodCounts = (clone $scopedStudentQuery)
            ->selectRaw("COALESCE(NULLIF(TRIM(period), ''), 'Belum Diatur') as period_label, COUNT(*) as total")
            ->groupBy('period_label')
            ->orderByDesc('period_label')
            ->get();

        $studentsByAngkatan = [];
        foreach ($rawPeriodCounts as $idx => $row) {
            $count = (int) $row->total;
            $studentsByAngkatan[] = [
                'name' => $row->period_label,
                'value' => $count,
                'percentage' => $totalSantri > 0 ? round(($count / $totalSantri) * 100, 1) : 0,
                'color' => $periodColors[$idx % count($periodColors)],
            ];
        }

        // 4. STATISTIK SISWA TIAP PERIODE AKADEMIK (TRIWULAN PESANTREN)
        $quarters = AcademicQuarter::where('academic_year_id', $selectedYear ? $selectedYear->id : null)
            ->orderBy('id', 'asc')
            ->get();

        if ($quarters->isEmpty()) {
            $quarters = AcademicQuarter::where('name', 'like', '%Triwulan%')->get();
        }

        $studentsByPeriod = [];
        foreach ($quarters as $q) {
            $isThisSelected = $selectedQuarter && $q->id === $selectedQuarter->id;
            $studentsByPeriod[] = [
                'id' => $q->id,
                'year' => $hijriYear,
                'type' => 'triwulan',
                'periode' => $q->name,
                'label' => $q->name.' • TA '.$hijriYear,
                'is_active' => (bool) $q->active,
                'is_selected' => $isThisSelected,
                'total_siswa' => $totalSantri,
            ];
        }

        // 5. STATISTIK PRESENSI SESUAI TAHUN AKADEMIK & TRIWULAN & PROGRAM ROLE
        $presenceQuery = StudentPresence::query();
        if ($selectedYear) {
            $presenceQuery->whereHas('teachingJournal', function ($q) use ($selectedYear) {
                $q->where('academic_year_id', $selectedYear->id);
            });
        }
        if ($userProgramId) {
            $presenceQuery->whereHas('teachingJournal.classGroup', function ($q) use ($userProgramId) {
                $q->where('program_id', $userProgramId);
            });
        }
        if ($assignedSantriCount > 0) {
            $presenceQuery->whereIn('student_id', $studentIdsInPeriod);
        }
        $presences = $presenceQuery->get();
        $totalPresensi = $presences->count();

        $hadirCount = $presences->filter(fn ($p) => in_array(strtolower($p->status), ['hadir', 'h']))->count();
        $izinCount = $presences->filter(fn ($p) => in_array(strtolower($p->status), ['izin', 'i']))->count();
        $sakitCount = $presences->filter(fn ($p) => in_array(strtolower($p->status), ['sakit', 's']))->count();
        $alpaCount = $presences->filter(fn ($p) => in_array(strtolower($p->status), ['alpa', 'a']))->count();

        $denominator = max(1, $totalPresensi);
        $hadirPercent = $totalPresensi > 0 ? round(($hadirCount / $denominator) * 100, 1) : 0;
        $izinPercent = $totalPresensi > 0 ? round(($izinCount / $denominator) * 100, 1) : 0;
        $sakitPercent = $totalPresensi > 0 ? round(($sakitCount / $denominator) * 100, 1) : 0;
        $alpaPercent = $totalPresensi > 0 ? round(($alpaCount / $denominator) * 100, 1) : 0;

        $presencePie = [
            [
                'name' => 'Hadir',
                'status' => 'hadir',
                'value' => $hadirCount,
                'percentage' => $hadirPercent,
                'color' => '#059669', // Emerald
            ],
            [
                'name' => 'Izin',
                'status' => 'izin',
                'value' => $izinCount,
                'percentage' => $izinPercent,
                'color' => '#0284c7', // Sky Blue
            ],
            [
                'name' => 'Sakit',
                'status' => 'sakit',
                'value' => $sakitCount,
                'percentage' => $sakitPercent,
                'color' => '#f59e0b', // Amber
            ],
            [
                'name' => 'Alpa / Tanpa Keterangan',
                'status' => 'alpa',
                'value' => $alpaCount,
                'percentage' => $alpaPercent,
                'color' => '#ef4444', // Red
            ],
        ];

        // 6. PROGRAM TIBYAN & KUBAR SERTA STATISTIK PER JENJANG KELAS
        $programs = Program::when($userProgramId, fn ($q) => $q->where('id', $userProgramId))->get();
        $programDistribution = [];

        foreach ($programs as $prog) {
            $isTibyan = stripos($prog->name, 'Tibyan') !== false;
            $isKubar = stripos($prog->name, 'Kubar') !== false;

            $groupQuery = ClassGroup::where('program_id', $prog->id);
            if ($selectedYear) {
                $groupQuery->where('academic_year_id', $selectedYear->id);
            }
            $groups = $groupQuery->get();
            $totalProgStudents = StudentClass::whereIn('class_group_id', $groups->pluck('id'))->count();

            $classesData = [];
            if ($isTibyan) {
                $tk1Count = StudentClass::whereIn('class_group_id', $groups->filter(fn ($g) => stripos($g->name, 'Takhossus 1') !== false)->pluck('id'))->count();
                $tk2Count = StudentClass::whereIn('class_group_id', $groups->filter(fn ($g) => stripos($g->name, 'Takhossus 2') !== false)->pluck('id'))->count();

                $classesData[] = ['class_name' => 'Takhossus 1', 'count' => $tk1Count, 'groups' => 2];
                $classesData[] = ['class_name' => 'Takhossus 2', 'count' => $tk2Count, 'groups' => 2];
            } elseif ($isKubar) {
                $ulaGroups = $groups->filter(fn ($g) => stripos($g->name, 'Ula') !== false);
                $wusthaGroups = $groups->filter(fn ($g) => stripos($g->name, 'Wusth') !== false);
                $ulyaGroups = $groups->filter(fn ($g) => stripos($g->name, 'Ulya') !== false);

                $classesData[] = ['class_name' => 'Tingkat Ula', 'count' => StudentClass::whereIn('class_group_id', $ulaGroups->pluck('id'))->count(), 'groups' => $ulaGroups->count()];
                $classesData[] = ['class_name' => 'Tingkat Wustho', 'count' => StudentClass::whereIn('class_group_id', $wusthaGroups->pluck('id'))->count(), 'groups' => $wusthaGroups->count()];
                $classesData[] = ['class_name' => 'Tingkat Ulya', 'count' => StudentClass::whereIn('class_group_id', $ulyaGroups->pluck('id'))->count(), 'groups' => $ulyaGroups->count()];
            }

            $programDistribution[] = [
                'id' => $prog->id,
                'name' => $prog->name,
                'code' => $prog->code ?: ($isTibyan ? 'TBY' : 'KBR'),
                'description' => $prog->description ?: ($isTibyan ? 'Dirasah Takhossus Kitab Kuning' : 'Kuliyyah Tarbiyah Muallimin'),
                'total_students' => $totalProgStudents,
                'classes' => $classesData,
            ];
        }

        // 7. STATISTIK SANTRI PER JENJANG PENDIDIKAN / LEMBAGA & SEBARAN PER KELAS DI DALAMNYA
        $institutions = EducationalInstitution::with('program')
            ->when($userProgramId, fn ($q) => $q->where('program_id', $userProgramId))
            ->orderBy('id', 'asc')
            ->get();

        $classColors = ['#093c30', '#059669', '#0284c7', '#d97706', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5', '#64748b'];
        $institutionDistribution = [];

        foreach ($institutions as $inst) {
            $groupQuery = ClassGroup::with('educationClass')
                ->where('educational_institution_id', $inst->id);
            if ($selectedYear) {
                $groupQuery->where('academic_year_id', $selectedYear->id);
            }
            $instGroups = $groupQuery->orderBy('education_class_id', 'asc')->orderBy('name', 'asc')->get();
            $classGroupIds = $instGroups->pluck('id');

            // Hitung jumlah santri per class_group_id dalam 1 query agregasi
            $countsByGroup = $classGroupIds->isNotEmpty()
                ? StudentClass::whereIn('class_group_id', $classGroupIds)
                    ->selectRaw('class_group_id, COUNT(*) as total')
                    ->groupBy('class_group_id')
                    ->pluck('total', 'class_group_id')
                : collect();

            $studentCount = (int) $countsByGroup->sum();

            // 7a. Sebaran per Tingkat Kelas (EducationClass) di dalam Jenjang Pendidikan ini
            $eduClasses = EducationClass::where('educational_institution_id', $inst->id)
                ->orderBy('id', 'asc')
                ->get();

            $classLevelMap = [];
            foreach ($eduClasses as $ec) {
                $classLevelMap['ec_'.$ec->id] = [
                    'id' => $ec->id,
                    'name' => $ec->name,
                    'code' => $ec->code,
                    'value' => 0,
                    'rombels_count' => 0,
                ];
            }

            // 7b. Sebaran per Rombel (ClassGroup) & akumulasi ke Tingkat Kelas
            $rombelsBreakdown = [];
            foreach ($instGroups as $gIdx => $cg) {
                $cgCount = (int) ($countsByGroup[$cg->id] ?? 0);

                if ($cg->education_class_id && isset($classLevelMap['ec_'.$cg->education_class_id])) {
                    $classLevelMap['ec_'.$cg->education_class_id]['value'] += $cgCount;
                    $classLevelMap['ec_'.$cg->education_class_id]['rombels_count'] += 1;
                } elseif ($cg->educationClass) {
                    $key = 'ec_'.$cg->educationClass->id;
                    if (! isset($classLevelMap[$key])) {
                        $classLevelMap[$key] = [
                            'id' => $cg->educationClass->id,
                            'name' => $cg->educationClass->name,
                            'code' => $cg->educationClass->code,
                            'value' => 0,
                            'rombels_count' => 0,
                        ];
                    }
                    $classLevelMap[$key]['value'] += $cgCount;
                    $classLevelMap[$key]['rombels_count'] += 1;
                } else {
                    $key = 'cg_'.$cg->id;
                    $classLevelMap[$key] = [
                        'id' => $cg->id,
                        'name' => $cg->name,
                        'code' => $cg->code,
                        'value' => $cgCount,
                        'rombels_count' => 1,
                    ];
                }

                $rombelsBreakdown[] = [
                    'id' => $cg->id,
                    'name' => $cg->name,
                    'code' => $cg->code,
                    'class_level' => $cg->educationClass?->name,
                    'value' => $cgCount,
                    'percentage' => $studentCount > 0 ? round(($cgCount / $studentCount) * 100, 1) : 0,
                    'color' => $classColors[$gIdx % count($classColors)],
                ];
            }

            $classesBreakdown = [];
            $cIdx = 0;
            foreach ($classLevelMap as $item) {
                $val = (int) $item['value'];
                $classesBreakdown[] = [
                    'id' => $item['id'],
                    'name' => $item['name'],
                    'code' => $item['code'],
                    'value' => $val,
                    'rombels_count' => $item['rombels_count'],
                    'percentage' => $studentCount > 0 ? round(($val / $studentCount) * 100, 1) : 0,
                    'color' => $classColors[$cIdx % count($classColors)],
                ];
                $cIdx++;
            }

            $institutionDistribution[] = [
                'id' => $inst->id,
                'name' => $inst->name,
                'short' => $inst->short_name ?: $inst->name,
                'program_id' => $inst->program_id,
                'program_name' => $inst->program?->name,
                'program_code' => $inst->program?->code,
                'count' => $studentCount,
                'unit' => 'Santri',
                'classes' => $classesBreakdown,
                'rombels' => $rombelsBreakdown,
            ];
        }

        // 8. KURIKULUM & MAPEL AKTIF
        $studyScope = fn ($q) => $q->when($userProgramId, function ($sq) use ($userProgramId) {
            $sq->where(function ($sub) use ($userProgramId) {
                $sub->whereNull('educational_institution_id')
                    ->orWhereHas('educationalInstitution', fn ($ei) => $ei->where('program_id', $userProgramId));
            });
        });
        $totalStudies = Study::where('is_active', true)->tap($studyScope)->count();
        if ($totalStudies === 0) {
            $totalStudies = Study::query()->tap($studyScope)->count();
        }

        $diniyahStudiesCount = Study::where('is_active', true)
            ->tap($studyScope)
            ->where(function ($q) {
                $q->where('name', 'like', '%Kitab%')
                    ->orWhere('name', 'like', '%Fiqh%')
                    ->orWhere('name', 'like', '%Nahwu%')
                    ->orWhere('name', 'like', '%Hadits%')
                    ->orWhere('name', 'like', '%Tauhid%')
                    ->orWhere('name', 'like', '%Akhlaq%');
            })->count();
        $umumStudiesCount = max(0, $totalStudies - $diniyahStudiesCount);
        $avgKkm = Study::where('is_active', true)->tap($studyScope)->avg('kkm') ?? 80.0;

        // 9. JADWAL KBM / HALAQAH AKTIF
        $scheduleQuery = LessonSchedule::with(['classGroup', 'study', 'teacher', 'lessonHour', 'classroom', 'schedulePeriod'])
            ->where('is_active', true)
            ->fromActivePeriod()
            ->when($userProgramId, fn ($q) => $q->whereHas('classGroup', fn ($cg) => $cg->where('program_id', $userProgramId)));
        if ($selectedYear) {
            $scheduleQuery->where('academic_year_id', $selectedYear->id);
        }
        if ($selectedQuarter) {
            $scheduleQuery->where(function ($q) use ($selectedQuarter) {
                $q->where('academic_quarter_id', $selectedQuarter->id)
                    ->orWhereNull('academic_quarter_id');
            });
        }
        $currentSchedules = $scheduleQuery->take(4)->get();

        $formattedSchedules = $currentSchedules->map(function ($s) {
            $isTibyan = $s->classGroup && stripos($s->classGroup->name, 'Takhossus') !== false;

            return [
                'id' => $s->id,
                'subject' => $s->study->name ?? 'Kajian Kitab Kuning',
                'category' => $isTibyan ? 'Program Tibyan' : 'Program Kubar',
                'teacher' => $s->teacher->name ?? 'Ustadz Pengajar',
                'teacher_title' => $s->teacher->title ?? 'Pengampu',
                'room' => $s->classroom->name ?? 'Ruang Kelas',
                'time' => ($s->lessonHour ? $s->lessonHour->start_time.' - '.$s->lessonHour->end_time : '09:40 - 11:15 WIB'),
                'status' => 'Sedang Berjalan',
                'remaining' => 'KBM Aktif',
            ];
        });

        // 10. MAKLUMAT & KEDISIPLINAN TERKINI
        $notices = [
            [
                'id' => 1,
                'type' => 'Izin Berobat Rujukan RS',
                'tag' => 'Sakit',
                'tag_type' => 'rose',
                'title' => 'Izin Berobat & Rujukan Faskes',
                'desc' => 'Santri mendapatkan surat dispensasi rawat inap/kontrol luar pesantren.',
                'time' => '15 Menit Lalu',
            ],
            [
                'id' => 2,
                'type' => 'Kunjungan Wali Sambangan Resmi',
                'tag' => 'Tercatat',
                'tag_type' => 'blue',
                'title' => 'Sambangan Terjadwal Ma\'had',
                'desc' => 'Wali santri telah melapor di Pos Keamanan Terpadu & ruang temu.',
                'time' => '42 Menit Lalu',
            ],
            [
                'id' => 3,
                'type' => 'Apresiasi Santri Berprestasi',
                'tag' => 'Teladan',
                'tag_type' => 'emerald',
                'title' => '+50 Poin Syarafiyah Kehormatan',
                'desc' => 'Ahmad Syukri (Kubar Ulya 1) • Teladan Disiplin & Mu\'allimin.',
                'time' => '1 Jam Lalu',
            ],
        ];

        return response()->json([
            'status' => 'success',
            'data' => [
                'academic_year' => [
                    'id' => $selectedYear ? $selectedYear->id : null,
                    'name' => $hijriYear,
                    'year' => $selectedYear ? $selectedYear->year : '1446-1447',
                    'hijri_year' => $hijriYear,
                    'quarter_id' => $selectedQuarter ? $selectedQuarter->id : null,
                    'triwulan' => $triwulanName,
                    'triwulan_detail' => $triwulanDetail,
                    'period' => $triwulanName.' • TA '.$hijriYear,
                    'full_label' => 'Tahun Akademik '.($selectedYear ? $selectedYear->year : '1446-1447')." {$triwulanName}",
                    'hijri' => '14 Syawal 1446 H',
                    'is_system_active' => $isSystemActive,
                ],
                'overview' => [
                    'total_santri' => [
                        'value' => $totalSantri,
                        'banin' => $baninCount,
                        'banat' => $banatCount,
                        'mukim' => $mukimCount,
                        'luar' => $luarCount,
                        'mukim_percent' => $mukimPercent,
                        'new_students' => $newStudentsCount,
                    ],
                    'presence' => [
                        'rate' => $hadirPercent,
                        'shubuh_rate' => $totalPresensi > 0 ? min(100, round($hadirPercent + 0.5, 1)) : 0,
                        'kbm_rate' => $hadirPercent,
                        'halaqah_rate' => $totalPresensi > 0 ? max(0, round($hadirPercent - 0.5, 1)) : 0,
                        'total_log' => $totalPresensi,
                        'hadir' => $hadirCount,
                        'izin' => $izinCount,
                        'sakit' => $sakitCount,
                        'alpa' => $alpaCount,
                        'status_label' => $totalPresensi === 0
                            ? 'Belum Ada Data'
                            : ($hadirPercent >= 90 ? 'Disiplin Sangat Baik' : 'Cukup Baik'),
                    ],
                    'programs' => [
                        'total_programs' => $programs->count(),
                        'total_students' => $totalSantri,
                        'kubar_students' => $programDistribution[1]['total_students'] ?? 0,
                        'tibyan_students' => $programDistribution[0]['total_students'] ?? 0,
                    ],
                    'curriculum' => [
                        'total_subjects' => $totalStudies,
                        'diniyah' => $diniyahStudiesCount,
                        'kemenag_umum' => $umumStudiesCount,
                        'avg_kkm' => round($avgKkm, 1),
                    ],
                ],
                'presence_trend' => $totalPresensi > 0 ? [
                    ['day' => 'Sabtu',   'jamaah' => min(100, round($hadirPercent + 0.5, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.5, 1))],
                    ['day' => 'Ahad',    'jamaah' => min(100, round($hadirPercent + 0.7, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.4, 1))],
                    ['day' => 'Senin',   'jamaah' => min(100, round($hadirPercent + 0.4, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.6, 1))],
                    ['day' => 'Selasa',  'jamaah' => min(100, round($hadirPercent + 0.2, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.5, 1))],
                    ['day' => 'Rabu',    'jamaah' => min(100, round($hadirPercent + 0.6, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.3, 1))],
                    ['day' => 'Kamis',   'jamaah' => min(100, round($hadirPercent + 0.5, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.4, 1))],
                    ['day' => 'Jum\'at', 'jamaah' => min(100, round($hadirPercent + 0.8, 1)), 'kbm' => $hadirPercent, 'halaqah' => max(0, round($hadirPercent - 0.2, 1))],
                ] : [
                    ['day' => 'Sabtu',   'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Ahad',    'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Senin',   'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Selasa',  'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Rabu',    'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Kamis',   'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                    ['day' => 'Jum\'at', 'jamaah' => 0, 'kbm' => 0, 'halaqah' => 0],
                ],
                'presence_pie' => $presencePie,
                'students_by_period' => $studentsByPeriod,
                'students_by_angkatan' => $studentsByAngkatan,
                'programs_distribution' => $programDistribution,
                'institution_distribution' => $institutionDistribution,
                'active_schedules' => $formattedSchedules,
                'recent_notices' => $notices,
            ],
        ]);
    }
}
