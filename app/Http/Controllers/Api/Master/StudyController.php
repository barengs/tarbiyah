<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\EducationalInstitution;
use App\Models\Study;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class StudyController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:mapel.create', only: ['store', 'import']),
            new Middleware('permission:mapel.update', only: ['update']),
            new Middleware('permission:mapel.delete', only: ['destroy']),
        ];
    }

    public function index(Request $request)
    {
        try {
            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            $query = Study::with(['educationalInstitution', 'teachers'])
                ->where('name', 'not like', '%Tahfidz%')
                ->where('name', 'not like', '%Tahfizh%');

            if ($userProgramId) {
                $query->where(function ($q) use ($userProgramId) {
                    $q->whereNull('educational_institution_id')
                        ->orWhereHas('educationalInstitution', fn ($ei) => $ei->where('program_id', $userProgramId));
                });
            }

            if ($request->filled('educational_institution_id')) {
                $instId = $request->query('educational_institution_id');
                $query->where(function ($q) use ($instId) {
                    $q->where('educational_institution_id', $instId)
                        ->orWhereNull('educational_institution_id');
                });
            }

            if ($request->filled('study_type') && $request->query('study_type') !== 'all') {
                $query->where('study_type', $request->query('study_type'));
            }

            // Jika dipanggil untuk jadwal pelajaran KBM, kecualikan mapel muatan_lokal (non-kelas)
            if ($request->boolean('for_schedule')) {
                $query->whereIn('study_type', ['reguler', 'khusus']);
            }

            if ($request->has('is_active') && $request->query('is_active') !== '') {
                $query->where('is_active', filter_var($request->query('is_active'), FILTER_VALIDATE_BOOLEAN));
            }

            if ($request->filled('search')) {
                $search = $request->query('search');
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%");
                });
            }

            $studies = $query->orderByRaw("FIELD(study_type, 'khusus', 'reguler', 'muatan_lokal')")
                ->orderBy('order', 'asc')
                ->orderBy('name', 'asc')
                ->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data mata pelajaran berhasil diambil',
                'data' => $studies,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving studies: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data mata pelajaran',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'code' => 'nullable|string|max:20',
            'name' => 'required|string|max:255',
            'study_type' => 'nullable|in:reguler,khusus,muatan_lokal',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'order' => 'nullable|integer',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'teacher_ids' => 'nullable|array',
            'teacher_ids.*' => 'exists:teachers,id',
        ]);

        try {
            DB::beginTransaction();

            $study = Study::create([
                'educational_institution_id' => $validated['educational_institution_id'] ?? null,
                'code' => $validated['code'] ?? null,
                'name' => $validated['name'],
                'study_type' => $validated['study_type'] ?? 'reguler',
                'kkm' => $validated['kkm'] ?? 75.00,
                'order' => $validated['order'] ?? 1,
                'description' => $validated['description'] ?? null,
                'is_active' => $validated['is_active'] ?? true,
            ]);

            if (! empty($validated['teacher_ids'])) {
                $study->teachers()->sync($validated['teacher_ids']);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Mata pelajaran berhasil ditambahkan',
                'data' => $study->load(['educationalInstitution', 'teachers']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating study: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambahkan mata pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $study = Study::with(['educationalInstitution', 'teachers'])->find($id);

        if (! $study) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail mata pelajaran berhasil diambil',
            'data' => $study,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $study = Study::find($id);

        if (! $study) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'educational_institution_id' => 'nullable|exists:educational_institutions,id',
            'code' => 'nullable|string|max:20',
            'name' => 'sometimes|required|string|max:255',
            'study_type' => 'sometimes|required|in:reguler,khusus,muatan_lokal',
            'kkm' => 'nullable|numeric|min:0|max:100',
            'order' => 'nullable|integer',
            'description' => 'nullable|string',
            'is_active' => 'nullable|boolean',
            'teacher_ids' => 'nullable|array',
            'teacher_ids.*' => 'exists:teachers,id',
        ]);

        try {
            DB::beginTransaction();

            $study->update($validated);

            if (isset($validated['teacher_ids'])) {
                $study->teachers()->sync($validated['teacher_ids']);
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Mata pelajaran berhasil diperbarui',
                'data' => $study->fresh(['educationalInstitution', 'teachers']),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating study: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui mata pelajaran',
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $study = Study::find($id);

        if (! $study) {
            return response()->json([
                'status' => 'error',
                'message' => 'Mata pelajaran tidak ditemukan',
            ], 404);
        }

        try {
            $study->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Mata pelajaran berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting study: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus mata pelajaran',
            ], 500);
        }
    }

    /**
     * Ekspor Data Mata Pelajaran ke File Excel (.xlsx)
     */
    public function export(Request $request)
    {
        try {
            $query = Study::with(['educationalInstitution', 'teachers']);

            if ($request->filled('educational_institution_id')) {
                $query->where('educational_institution_id', $request->query('educational_institution_id'));
            }

            if ($request->filled('study_type') && $request->query('study_type') !== 'all') {
                $query->where('study_type', $request->query('study_type'));
            }

            $studies = $query->orderBy('order', 'asc')->orderBy('name', 'asc')->get();

            $spreadsheet = new Spreadsheet;
            $spreadsheet->getProperties()
                ->setCreator('Tarbiyah — Sistem Manajemen Pendidikan')
                ->setTitle('Data Mata Pelajaran')
                ->setSubject('Ekspor Master Mata Pelajaran');

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Mata Pelajaran');

            // Header Judul
            $sheet->setCellValue('A1', 'DATA MASTER MATA PELAJARAN');
            $sheet->mergeCells('A1:H1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new Color('0B57D0'));
            $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);

            $sheet->setCellValue('A2', 'Tanggal Ekspor: '.now()->translatedFormat('d F Y H:i'));
            $sheet->mergeCells('A2:H2');
            $sheet->getStyle('A2')->getFont()->setSize(10)->setItalic(true)->setColor(new Color('64748B'));

            // Table Header
            $headers = ['No', 'Kode Mapel', 'Nama Mata Pelajaran', 'Institusi Pendidikan', 'Kategori/Tipe', 'KKM', 'Urutan', 'Status'];
            $colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

            foreach ($headers as $idx => $header) {
                $col = $colLetters[$idx];
                $sheet->setCellValue($col.'4', $header);
            }

            $headerRange = 'A4:H4';
            $sheet->getStyle($headerRange)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 11,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '0B57D0'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension(4)->setRowHeight(26);

            $rowIdx = 5;
            foreach ($studies as $i => $s) {
                $sheet->setCellValue('A'.$rowIdx, $i + 1);
                $sheet->setCellValueExplicit('B'.$rowIdx, $s->code ?? '-', DataType::TYPE_STRING);
                $sheet->setCellValue('C'.$rowIdx, $s->name);
                $sheet->setCellValue('D'.$rowIdx, $s->educationalInstitution?->name ?? 'Semua Institusi / Umum');
                $sheet->setCellValue('E'.$rowIdx, ucfirst(str_replace('_', ' ', $s->study_type ?? 'reguler')));
                $sheet->setCellValue('F'.$rowIdx, (float) $s->kkm);
                $sheet->setCellValue('G'.$rowIdx, (int) $s->order);
                $sheet->setCellValue('H'.$rowIdx, $s->is_active ? 'Aktif' : 'Nonaktif');

                $sheet->getStyle('A'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('B'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('E'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('F'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle('G'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('H'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                if ($rowIdx % 2 === 0) {
                    $sheet->getStyle("A{$rowIdx}:H{$rowIdx}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('F8FAFC');
                }

                $rowIdx++;
            }

            $lastRow = max(4, $rowIdx - 1);
            $sheet->getStyle("A4:H{$lastRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
            ]);

            foreach ($colLetters as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            $filename = 'Master_Mata_Pelajaran_'.date('Ymd_His').'.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error exporting studies: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengekspor data mata pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unduh Template Excel untuk Import Mata Pelajaran
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new Spreadsheet;
            $spreadsheet->getProperties()
                ->setCreator('Tarbiyah — Sistem Manajemen Pendidikan')
                ->setTitle('Template Import Mata Pelajaran');

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Template Mapel');

            // Petunjuk Pengisian
            $sheet->setCellValue('A1', 'PETUNJUK PENGISIAN TEMPLATE MATA PELAJARAN');
            $sheet->mergeCells('A1:G1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12)->setColor(new Color('0B57D0'));

            $sheet->setCellValue('A2', '1. Kolom "Nama Mata Pelajaran" wajib diisi. Kolom lainnya opsional.');
            $sheet->setCellValue('A3', '2. Kolom "Tipe Mapel" diisi salah satu: reguler, khusus (diniyah), atau muatan_lokal.');
            $sheet->setCellValue('A4', '3. Kolom "Nama Institusi" diisi persis nama institusi/sekolah, atau biarkan kosong jika berlaku umum.');
            $sheet->setCellValue('A5', '4. Nilai KKM diisi angka (default 75). Status diisi "aktif" atau "nonaktif".');
            $sheet->getStyle('A2:A5')->getFont()->setSize(9)->setColor(new Color('64748B'));

            // Header Tabel (Baris 7)
            $headers = ['Kode Mapel', 'Nama Mata Pelajaran *', 'Nama Institusi', 'Tipe Mapel', 'KKM', 'Urutan', 'Status'];
            $colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

            foreach ($headers as $idx => $header) {
                $sheet->setCellValue($colLetters[$idx].'7', $header);
            }

            $sheet->getStyle('A7:G7')->applyFromArray([
                'font' => [
                    'bold' => true,
                    'color' => ['rgb' => 'FFFFFF'],
                    'size' => 10,
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '0B57D0'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
            ]);
            $sheet->getRowDimension(7)->setRowHeight(25);

            // Baris Contoh (Baris 8-10)
            $examples = [
                ['FIQ-01', 'Fiqih Fathul Qorib', 'Madrasah Diniyah Ula', 'khusus', 75, 1, 'aktif'],
                ['NAH-01', 'Nahwu Jurumiyyah', 'Madrasah Diniyah Ula', 'khusus', 75, 2, 'aktif'],
                ['MAT-7', 'Matematika', 'SMP Islam', 'reguler', 70, 3, 'aktif'],
            ];

            foreach ($examples as $eIdx => $ex) {
                $rowNum = 8 + $eIdx;
                foreach ($ex as $cIdx => $val) {
                    $sheet->setCellValue($colLetters[$cIdx].$rowNum, $val);
                }
            }

            $sheet->getStyle('A7:G10')->applyFromArray([
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'CBD5E1'],
                    ],
                ],
            ]);

            foreach ($colLetters as $col) {
                $sheet->getColumnDimension($col)->setAutoSize(true);
            }

            $filename = 'Template_Import_Mata_Pelajaran.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating study template: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat template import mata pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import Data Mata Pelajaran dari File Excel (.xlsx, .xls, .csv)
     */
    public function import(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:10240',
        ]);

        try {
            $uploadedFile = $request->file('file');
            $spreadsheet = IOFactory::load($uploadedFile->getRealPath());
            $worksheet = $spreadsheet->getSheet(0);
            $rows = $worksheet->toArray(null, true, false, false);

            if (empty($rows) || count($rows) < 2) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'File Excel kosong atau tidak memiliki baris data.',
                ], 422);
            }

            // Cari baris header (mencari kolom dengan teks "nama" atau "mapel")
            $headerRowIdx = null;
            $codeCol = 0;
            $nameCol = 1;
            $instCol = 2;
            $typeCol = 3;
            $kkmCol = 4;
            $orderCol = 5;
            $statusCol = 6;

            foreach ($rows as $idx => $row) {
                $firstCell = strtoupper(trim((string) ($row[0] ?? '')));
                if (str_starts_with($firstCell, 'PETUNJUK') || preg_match('/^\d+\./', $firstCell)) {
                    continue;
                }

                foreach ($row as $colIdx => $cellVal) {
                    $val = strtolower(trim((string) $cellVal));
                    if (strlen($val) <= 50 && (str_contains($val, 'nama mata') || str_contains($val, 'nama mapel') || $val === 'mata pelajaran')) {
                        $headerRowIdx = $idx;
                        $nameCol = $colIdx;
                        break 2;
                    }
                }
            }

            // Jika tidak ditemukan header otomatis, asumsikan baris pertama atau baris ke-7 (jika memakai template)
            if ($headerRowIdx === null) {
                $headerRowIdx = count($rows) >= 7 ? 6 : 0;
            }

            // Deteksi indeks kolom dari baris header terpilih
            // Urutan pengecekan sangat penting: cek kata kunci spesifik ('institusi', 'tipe', 'kode')
            // lebih dulu agar kolom "Nama Institusi" atau "Tipe Mapel" tidak salah terdeteksi sebagai kolom Nama Mapel.
            if (isset($rows[$headerRowIdx])) {
                foreach ($rows[$headerRowIdx] as $cIdx => $cell) {
                    $norm = strtolower(trim((string) $cell));
                    if ($norm === '') {
                        continue;
                    }

                    if (str_contains($norm, 'kode')) {
                        $codeCol = $cIdx;
                    } elseif (str_contains($norm, 'institusi') || str_contains($norm, 'lembaga') || str_contains($norm, 'jenjang')) {
                        $instCol = $cIdx;
                    } elseif (str_contains($norm, 'tipe') || str_contains($norm, 'kategori')) {
                        $typeCol = $cIdx;
                    } elseif (str_contains($norm, 'kkm')) {
                        $kkmCol = $cIdx;
                    } elseif (str_contains($norm, 'urut')) {
                        $orderCol = $cIdx;
                    } elseif (str_contains($norm, 'status') || str_contains($norm, 'aktif')) {
                        $statusCol = $cIdx;
                    } elseif (
                        str_contains($norm, 'nama mata')
                        || str_contains($norm, 'nama mapel')
                        || str_contains($norm, 'mata pelajaran')
                        || str_contains($norm, 'fan kitab')
                        || str_contains($norm, 'nama')
                    ) {
                        $nameCol = $cIdx;
                    }
                }
            }

            $allInstitutions = EducationalInstitution::all();
            $institutionsExact = [];
            $institutionsFullName = [];
            foreach ($allInstitutions as $instItem) {
                $fullName = strtolower(trim((string) $instItem->name));
                if ($fullName !== '') {
                    $institutionsExact[$fullName] = $instItem->id;
                    $institutionsFullName[$fullName] = $instItem->id;
                }
                $shortName = strtolower(trim((string) $instItem->short_name));
                if ($shortName !== '') {
                    $institutionsExact[$shortName] = $instItem->id;
                }
            }

            $insertedCount = 0;
            $updatedCount = 0;
            $skippedInvalidCount = 0;

            DB::beginTransaction();

            // Bersihkan data rusak sisa bug deteksi kolom sebelumnya (record bernama 'khusus', 'reguler', 'muatan_lokal')
            Study::whereIn(DB::raw('LOWER(TRIM(name))'), ['khusus', 'reguler', 'muatan_lokal'])
                ->forceDelete();

            for ($r = $headerRowIdx + 1; $r < count($rows); $r++) {
                $row = $rows[$r];
                $name = trim((string) ($row[$nameCol] ?? ''));

                if ($name === '' || str_starts_with(strtoupper($name), 'PETUNJUK') || preg_match('/^\d+\./', $name)) {
                    continue;
                }

                // Guard: jangan simpan nilai tipe mapel sebagai nama mata pelajaran
                if (in_array(strtolower($name), ['khusus', 'reguler', 'muatan_lokal'], true)) {
                    $skippedInvalidCount++;

                    continue;
                }

                $code = trim((string) ($row[$codeCol] ?? ''));
                $instName = strtolower(trim((string) ($row[$instCol] ?? '')));
                $rawType = strtolower(trim((string) ($row[$typeCol] ?? 'reguler')));
                $rawKkm = trim((string) ($row[$kkmCol] ?? '75'));
                $rawOrder = trim((string) ($row[$orderCol] ?? '1'));
                $rawStatus = strtolower(trim((string) ($row[$statusCol] ?? 'aktif')));

                $instId = null;
                if ($instName !== '' && $instName !== '-' && ! str_contains($instName, 'umum') && ! str_contains($instName, 'semua')) {
                    if (isset($institutionsExact[$instName])) {
                        $instId = $institutionsExact[$instName];
                    } else {
                        foreach ($institutionsFullName as $keyName => $idVal) {
                            if (str_contains($keyName, $instName) || str_contains($instName, $keyName)) {
                                $instId = $idVal;
                                break;
                            }
                        }
                    }
                }

                $studyType = 'reguler';
                if (str_contains($rawType, 'khusus') || str_contains($rawType, 'diniyah') || str_contains($rawType, 'salaf') || str_contains($rawType, 'inti')) {
                    $studyType = 'khusus';
                } elseif (str_contains($rawType, 'muatan') || str_contains($rawType, 'lokal') || str_contains($rawType, 'mulok')) {
                    $studyType = 'muatan_lokal';
                }

                $kkm = is_numeric($rawKkm) ? (float) $rawKkm : 75.00;
                $order = is_numeric($rawOrder) ? (int) $rawOrder : 1;
                $isActive = ! in_array($rawStatus, ['nonaktif', 'tidak', '0', 'false', 'inactive']);

                // Cari berdasarkan code terlebih dahulu.
                // Hanya cocokkan berdasarkan (name + educational_institution_id) bila record target belum memiliki code
                // agar mapel dengan nama sama tetapi berbeda kode tidak saling menimpa.
                $existing = null;
                if ($code !== '' && $code !== '-') {
                    $existing = Study::withTrashed()->where('code', $code)->first();
                }
                if (! $existing) {
                    $nameQuery = Study::withTrashed()
                        ->where('name', $name)
                        ->where('educational_institution_id', $instId);

                    if ($code !== '' && $code !== '-') {
                        $nameQuery->where(function ($q) {
                            $q->whereNull('code')->orWhere('code', '');
                        });
                    }

                    $existing = $nameQuery->first();
                }

                if ($existing) {
                    if ($existing->trashed()) {
                        $existing->restore();
                    }
                    $existing->update([
                        'code' => $code !== '' && $code !== '-' ? $code : $existing->code,
                        'name' => $name,
                        'educational_institution_id' => $instId,
                        'study_type' => $studyType,
                        'kkm' => $kkm,
                        'order' => $order,
                        'is_active' => $isActive,
                    ]);
                    $updatedCount++;
                } else {
                    Study::create([
                        'code' => $code !== '' && $code !== '-' ? $code : null,
                        'name' => $name,
                        'educational_institution_id' => $instId,
                        'study_type' => $studyType,
                        'kkm' => $kkm,
                        'order' => $order,
                        'is_active' => $isActive,
                    ]);
                    $insertedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Import berhasil: {$insertedCount} mata pelajaran baru ditambahkan, {$updatedCount} diperbarui.",
                'data' => [
                    'inserted' => $insertedCount,
                    'updated' => $updatedCount,
                    'total' => $insertedCount + $updatedCount,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error importing studies: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengimpor mata pelajaran: '.$e->getMessage(),
            ], 500);
        }
    }
}
