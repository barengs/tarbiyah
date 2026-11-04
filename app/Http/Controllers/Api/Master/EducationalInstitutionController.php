<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Education;
use App\Models\EducationalInstitution;
use App\Models\EducationType;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class EducationalInstitutionController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:jenjang.create', only: ['store', 'import']),
            new Middleware('permission:jenjang.update', only: ['update']),
            new Middleware('permission:jenjang.delete', only: ['destroy']),
        ];
    }

    public function index()
    {
        try {
            $query = EducationalInstitution::with(['educationType', 'educations', 'classrooms', 'classes']);

            $user = auth('api')->user();
            $userProgramId = $user?->getActiveProgramId();

            if ($userProgramId) {
                $query->whereHas('educations', function ($q) use ($userProgramId) {
                    $q->where('program_id', $userProgramId);
                });
            }

            $institutions = $query->get();

            return response()->json([
                'status' => 'success',
                'message' => 'Data institusi pendidikan berhasil diambil',
                'data' => $institutions,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error retrieving institutions: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengambil data institusi pendidikan',
            ], 500);
        }
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'nullable|string|max:30',
            'education_type_id' => 'nullable|exists:education_types,id',
            'registration_number' => 'nullable|string|unique:educational_institutions,registration_number',
            'progression_type' => 'required|in:triwulan,semester,leveling',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
            'description' => 'nullable|string',
            'headmaster_id' => 'nullable|integer',
            'headmaster_name' => 'nullable|string|max:255',
            'logo' => 'nullable',
            'letterhead' => 'nullable',
        ]);

        try {
            DB::beginTransaction();

            if ($request->hasFile('logo')) {
                $request->validate(['logo' => 'image|mimes:jpeg,png,jpg,webp,svg|max:2048']);
                $validated['logo'] = $request->file('logo')->store('institutions/logos', 'public');
            } else {
                unset($validated['logo']);
            }

            if ($request->hasFile('letterhead')) {
                $request->validate(['letterhead' => 'image|mimes:jpeg,png,jpg,webp,svg|max:4096']);
                $validated['letterhead'] = $request->file('letterhead')->store('institutions/letterheads', 'public');
            } else {
                unset($validated['letterhead']);
            }

            $institution = EducationalInstitution::create($validated);
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Institusi pendidikan berhasil ditambahkan',
                'data' => $institution,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating institution: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menambahkan institusi: '.$e->getMessage(),
            ], 500);
        }
    }

    public function show(string $id)
    {
        $institution = EducationalInstitution::with(['educationType', 'educations', 'classrooms', 'classes'])->find($id);

        if (! $institution) {
            return response()->json([
                'status' => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Detail institusi pendidikan berhasil diambil',
            'data' => $institution,
        ], 200);
    }

    public function update(Request $request, string $id)
    {
        $institution = EducationalInstitution::find($id);

        if (! $institution) {
            return response()->json([
                'status' => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'short_name' => 'nullable|string|max:30',
            'education_type_id' => 'nullable|exists:education_types,id',
            'registration_number' => 'nullable|string|unique:educational_institutions,registration_number,'.$id,
            'progression_type' => 'sometimes|required|in:triwulan,semester,leveling',
            'address' => 'nullable|string',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'status' => 'nullable|in:active,inactive',
            'description' => 'nullable|string',
            'headmaster_id' => 'nullable|integer',
            'headmaster_name' => 'nullable|string|max:255',
            'logo' => 'nullable',
            'letterhead' => 'nullable',
            'remove_logo' => 'nullable|boolean',
            'remove_letterhead' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            // Handle upload / hapus logo
            if ($request->hasFile('logo')) {
                $request->validate(['logo' => 'image|mimes:jpeg,png,jpg,webp,svg|max:2048']);
                if ($institution->logo && Storage::disk('public')->exists($institution->logo)) {
                    Storage::disk('public')->delete($institution->logo);
                }
                $validated['logo'] = $request->file('logo')->store('institutions/logos', 'public');
            } elseif ($request->boolean('remove_logo')) {
                if ($institution->logo && Storage::disk('public')->exists($institution->logo)) {
                    Storage::disk('public')->delete($institution->logo);
                }
                $validated['logo'] = null;
            } else {
                unset($validated['logo']);
            }

            // Handle upload / hapus letterhead (kop surat)
            if ($request->hasFile('letterhead')) {
                $request->validate(['letterhead' => 'image|mimes:jpeg,png,jpg,webp,svg|max:4096']);
                if ($institution->letterhead && Storage::disk('public')->exists($institution->letterhead)) {
                    Storage::disk('public')->delete($institution->letterhead);
                }
                $validated['letterhead'] = $request->file('letterhead')->store('institutions/letterheads', 'public');
            } elseif ($request->boolean('remove_letterhead')) {
                if ($institution->letterhead && Storage::disk('public')->exists($institution->letterhead)) {
                    Storage::disk('public')->delete($institution->letterhead);
                }
                $validated['letterhead'] = null;
            } else {
                unset($validated['letterhead']);
            }

            unset($validated['remove_logo'], $validated['remove_letterhead']);

            $institution->update($validated);
            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Institusi pendidikan berhasil diperbarui',
                'data' => $institution->fresh(['educationType', 'educations', 'classrooms']),
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating institution: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal memperbarui institusi: '.$e->getMessage(),
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $institution = EducationalInstitution::find($id);

        if (! $institution) {
            return response()->json([
                'status' => 'error',
                'message' => 'Institusi pendidikan tidak ditemukan',
            ], 404);
        }

        try {
            $institution->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Institusi pendidikan berhasil dihapus',
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error deleting institution: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal menghapus institusi',
            ], 500);
        }
    }

    /**
     * Ekspor Data Institusi & Jenjang Pendidikan ke File Excel (.xlsx)
     */
    public function export(Request $request)
    {
        try {
            $institutions = EducationalInstitution::with(['educationType', 'educations'])->get();

            $spreadsheet = new Spreadsheet;
            $spreadsheet->getProperties()
                ->setCreator('Tarbiyah — Sistem Manajemen Pendidikan')
                ->setTitle('Data Institusi & Jenjang Pendidikan')
                ->setSubject('Ekspor Master Institusi dan Jenjang');

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Institusi & Jenjang');

            // Header Judul
            $sheet->setCellValue('A1', 'DATA MASTER INSTITUSI & JENJANG PENDIDIKAN');
            $sheet->mergeCells('A1:I1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new Color('0B57D0'));

            $sheet->setCellValue('A2', 'Tanggal Ekspor: '.now()->translatedFormat('d F Y H:i'));
            $sheet->mergeCells('A2:I2');
            $sheet->getStyle('A2')->getFont()->setSize(10)->setItalic(true)->setColor(new Color('64748B'));

            // Table Header
            $headers = ['No', 'Nama Institusi', 'Singkatan', 'Kelompok', 'No. Registrasi / NPSN', 'Model Kenaikan', 'Kontak (Telp/Email)', 'Status', 'Daftar Jenjang / Tingkat'];
            $colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

            foreach ($headers as $idx => $header) {
                $sheet->setCellValue($colLetters[$idx].'4', $header);
            }

            $sheet->getStyle('A4:I4')->applyFromArray([
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
            foreach ($institutions as $i => $inst) {
                $jenjangList = $inst->educations->pluck('name')->implode(', ');
                $contact = trim(($inst->phone ? $inst->phone.' ' : '').($inst->email ? '('.$inst->email.')' : ''));

                $sheet->setCellValue('A'.$rowIdx, $i + 1);
                $sheet->setCellValue('B'.$rowIdx, $inst->name);
                $sheet->setCellValue('C'.$rowIdx, $inst->short_name ?? '-');
                $sheet->setCellValue('D'.$rowIdx, $inst->educationType?->name ?? '-');
                $sheet->setCellValueExplicit('E'.$rowIdx, $inst->registration_number ?? '-', DataType::TYPE_STRING);
                $sheet->setCellValue('F'.$rowIdx, ucfirst($inst->progression_type));
                $sheet->setCellValue('G'.$rowIdx, $contact ?: '-');
                $sheet->setCellValue('H'.$rowIdx, $inst->status === 'active' ? 'Aktif' : 'Nonaktif');
                $sheet->setCellValue('I'.$rowIdx, $jenjangList ?: '-');

                $sheet->getStyle('A'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('C'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('E'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('F'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('H'.$rowIdx)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                if ($rowIdx % 2 === 0) {
                    $sheet->getStyle("A{$rowIdx}:I{$rowIdx}")->getFill()
                        ->setFillType(Fill::FILL_SOLID)
                        ->getStartColor()->setRGB('F8FAFC');
                }

                $rowIdx++;
            }

            $lastRow = max(4, $rowIdx - 1);
            $sheet->getStyle("A4:I{$lastRow}")->applyFromArray([
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

            $filename = 'Master_Institusi_Pendidikan_'.date('Ymd_His').'.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error exporting institutions: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengekspor data institusi: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Unduh Template Excel untuk Import Institusi & Jenjang
     */
    public function downloadTemplate()
    {
        try {
            $spreadsheet = new Spreadsheet;
            $spreadsheet->getProperties()
                ->setCreator('Tarbiyah — Sistem Manajemen Pendidikan')
                ->setTitle('Template Import Institusi & Jenjang');

            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Template Institusi');

            // Petunjuk Pengisian
            $sheet->setCellValue('A1', 'PETUNJUK PENGISIAN TEMPLATE INSTITUSI & JENJANG');
            $sheet->mergeCells('A1:G1');
            $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(12)->setColor(new Color('0B57D0'));

            $sheet->setCellValue('A2', '1. Kolom "Nama Institusi" wajib diisi.');
            $sheet->setCellValue('A3', '2. Kolom "Model Kenaikan" diisi: triwulan (pesantren), semester (formal), atau leveling (tahfidz).');
            $sheet->setCellValue('A4', '3. Kolom "Kelompok" diisi nama kelompok: Formal, Nonformal, Diniyah, Salafiyah, dll.');
            $sheet->setCellValue('A5', '4. Kolom "Daftar Jenjang" pisahkan dengan tanda koma (Contoh: "Kelas 7, Kelas 8, Kelas 9").');
            $sheet->getStyle('A2:A5')->getFont()->setSize(9)->setColor(new Color('64748B'));

            // Table Header (Baris 7)
            $headers = ['Nama Institusi *', 'Singkatan', 'Kelompok', 'No. Registrasi / NPSN', 'Model Kenaikan *', 'Telepon / Email', 'Daftar Jenjang (Pisah Koma)'];
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

            // Baris Contoh (Baris 8-9)
            $examples = [
                ['Madrasah Diniyah Ula', 'MD-ULA', 'Diniyah', '12345678', 'triwulan', '08123456789', 'Ula 1, Ula 2, Ula 3'],
                ['SMP Islam Terpadu', 'SMP-IT', 'Formal', '20501234', 'semester', 'info@smpit.sch.id', 'Kelas 7, Kelas 8, Kelas 9'],
            ];

            foreach ($examples as $eIdx => $ex) {
                $rowNum = 8 + $eIdx;
                foreach ($ex as $cIdx => $val) {
                    $sheet->setCellValue($colLetters[$cIdx].$rowNum, $val);
                }
            }

            $sheet->getStyle('A7:G9')->applyFromArray([
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

            $filename = 'Template_Import_Institusi_Pendidikan.xlsx';

            return response()->streamDownload(function () use ($spreadsheet) {
                $writer = new Xlsx($spreadsheet);
                $writer->save('php://output');
            }, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => "attachment; filename=\"{$filename}\"",
                'Cache-Control' => 'max-age=0',
            ]);
        } catch (\Exception $e) {
            Log::error('Error generating institution template: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal membuat template import institusi: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Import Data Institusi & Jenjang dari File Excel (.xlsx, .xls, .csv)
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

            $headerRowIdx = null;
            $nameCol = 0;
            $shortNameCol = 1;
            $groupCol = 2;
            $regCol = 3;
            $progCol = 4;
            $contactCol = 5;
            $levelsCol = 6;

            foreach ($rows as $idx => $row) {
                foreach ($row as $colIdx => $cellVal) {
                    $val = strtolower(trim((string) $cellVal));
                    if (str_contains($val, 'nama institusi') || str_contains($val, 'nama lembaga')) {
                        $headerRowIdx = $idx;
                        $nameCol = $colIdx;
                        break 2;
                    }
                }
            }

            if ($headerRowIdx === null) {
                $headerRowIdx = count($rows) >= 7 ? 6 : 0;
            }

            if (isset($rows[$headerRowIdx])) {
                foreach ($rows[$headerRowIdx] as $cIdx => $cell) {
                    $norm = strtolower(trim((string) $cell));
                    if (str_contains($norm, 'nama institusi') || str_contains($norm, 'nama lembaga')) {
                        $nameCol = $cIdx;
                    } elseif (str_contains($norm, 'singkatan') || str_contains($norm, 'kode')) {
                        $shortNameCol = $cIdx;
                    } elseif (str_contains($norm, 'kelompok')) {
                        $groupCol = $cIdx;
                    } elseif (str_contains($norm, 'registrasi') || str_contains($norm, 'npsn') || str_contains($norm, 'nsm')) {
                        $regCol = $cIdx;
                    } elseif (str_contains($norm, 'model') || str_contains($norm, 'kenaikan') || str_contains($norm, 'progression')) {
                        $progCol = $cIdx;
                    } elseif (str_contains($norm, 'kontak') || str_contains($norm, 'telepon') || str_contains($norm, 'email')) {
                        $contactCol = $cIdx;
                    } elseif (str_contains($norm, 'jenjang') || str_contains($norm, 'tingkat')) {
                        $levelsCol = $cIdx;
                    }
                }
            }

            $educationTypes = EducationType::all()->keyBy(fn ($t) => strtolower(trim($t->name)));

            $insertedCount = 0;
            $updatedCount = 0;

            DB::beginTransaction();

            for ($r = $headerRowIdx + 1; $r < count($rows); $r++) {
                $row = $rows[$r];
                $name = trim((string) ($row[$nameCol] ?? ''));

                if ($name === '' || str_starts_with($name, 'PETUNJUK') || str_starts_with($name, '1.') || str_starts_with($name, '2.')) {
                    continue;
                }

                $shortName = trim((string) ($row[$shortNameCol] ?? ''));
                $groupName = strtolower(trim((string) ($row[$groupCol] ?? '')));
                $regNumber = trim((string) ($row[$regCol] ?? ''));
                $rawProg = strtolower(trim((string) ($row[$progCol] ?? 'triwulan')));
                $contact = trim((string) ($row[$contactCol] ?? ''));
                $rawLevels = trim((string) ($row[$levelsCol] ?? ''));

                // Tipe kelompok pendidikan
                $typeId = null;
                if ($groupName !== '') {
                    if (isset($educationTypes[$groupName])) {
                        $typeId = $educationTypes[$groupName]->id;
                    } else {
                        $newType = EducationType::create(['name' => ucwords($groupName)]);
                        $educationTypes[$groupName] = $newType;
                        $typeId = $newType->id;
                    }
                }

                $progressionType = 'triwulan';
                if (str_contains($rawProg, 'semester') || str_contains($rawProg, 'formal')) {
                    $progressionType = 'semester';
                } elseif (str_contains($rawProg, 'leveling') || str_contains($rawProg, 'tahfidz')) {
                    $progressionType = 'leveling';
                }

                $phone = null;
                $email = null;
                if ($contact !== '') {
                    if (str_contains($contact, '@')) {
                        $email = $contact;
                    } else {
                        $phone = $contact;
                    }
                }

                $institution = EducationalInstitution::where('name', $name)->first();

                if ($institution) {
                    $institution->update([
                        'short_name' => $shortName ?: $institution->short_name,
                        'education_type_id' => $typeId ?: $institution->education_type_id,
                        'registration_number' => $regNumber ?: $institution->registration_number,
                        'progression_type' => $progressionType,
                        'phone' => $phone ?: $institution->phone,
                        'email' => $email ?: $institution->email,
                    ]);
                    $updatedCount++;
                } else {
                    $institution = EducationalInstitution::create([
                        'name' => $name,
                        'short_name' => $shortName ?: null,
                        'education_type_id' => $typeId,
                        'registration_number' => $regNumber ?: null,
                        'progression_type' => $progressionType,
                        'phone' => $phone,
                        'email' => $email,
                        'status' => 'active',
                    ]);
                    $insertedCount++;
                }

                // Buat/sinkronkan jenjang jika diisi (contoh: "Kelas 7, Kelas 8, Kelas 9")
                if ($rawLevels !== '' && $rawLevels !== '-') {
                    $levelNames = array_map('trim', explode(',', $rawLevels));
                    foreach ($levelNames as $lIdx => $lvlName) {
                        if ($lvlName === '') {
                            continue;
                        }
                        Education::firstOrCreate(
                            [
                                'educational_institution_id' => $institution->id,
                                'name' => $lvlName,
                            ],
                            [
                                'level' => $lIdx + 1,
                            ]
                        );
                    }
                }
            }

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => "Import berhasil: {$insertedCount} institusi baru ditambahkan, {$updatedCount} diperbarui.",
                'data' => [
                    'inserted' => $insertedCount,
                    'updated' => $updatedCount,
                    'total' => $insertedCount + $updatedCount,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error importing institutions: '.$e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => 'Gagal mengimpor institusi: '.$e->getMessage(),
            ], 500);
        }
    }
}
