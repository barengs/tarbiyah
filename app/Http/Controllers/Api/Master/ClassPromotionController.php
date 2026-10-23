<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\Student;
use App\Models\StudentClass;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ClassPromotionController extends Controller
{
    /**
     * Ambil daftar santri dalam rombel asal beserta kandidat kenaikan kelas.
     */
    public function candidates(string $classGroupId)
    {
        try {
            $classGroup = ClassGroup::with([
                'academicYear',
                'educationalInstitution',
                'educationClass',
            ])->findOrFail($classGroupId);

            $memberships = StudentClass::with(['student'])
                ->where('class_group_id', $classGroupId)
                ->where('status', 'aktif')
                ->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data kandidat kenaikan kelas berhasil diambil',
                'data'    => [
                    'class_group' => $classGroup,
                    'candidates'  => $memberships,
                ],
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching promotion candidates: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal mengambil data kandidat: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Eksekusi kenaikan kelas / mutasi / kelulusan massal.
     */
    public function bulkPromote(Request $request)
    {
        $validated = $request->validate([
            'source_class_group_id'     => 'required|exists:class_groups,id',
            'target_class_group_id'     => 'nullable|exists:class_groups,id',
            'target_academic_year_id'   => 'nullable|exists:academic_years,id',
            'students'                  => 'required|array|min:1',
            'students.*.student_id'     => 'required|exists:students,id',
            'students.*.action'         => 'required|in:naik_kelas,tinggal_kelas,lulus',
            'students.*.note'           => 'nullable|string',
        ]);

        $sourceGroup = ClassGroup::findOrFail($validated['source_class_group_id']);
        $targetGroup = !empty($validated['target_class_group_id']) 
            ? ClassGroup::find($validated['target_class_group_id']) 
            : null;

        $targetAcademicYearId = $validated['target_academic_year_id'] 
            ?? ($targetGroup ? $targetGroup->academic_year_id : $sourceGroup->academic_year_id);

        try {
            DB::beginTransaction();

            $promotedCount = 0;
            $retainedCount = 0;
            $graduatedCount = 0;

            foreach ($validated['students'] as $item) {
                $studentId = $item['student_id'];
                $action = $item['action'];
                $note = $item['note'] ?? null;

                $currentMembership = StudentClass::where('class_group_id', $sourceGroup->id)
                    ->where('student_id', $studentId)
                    ->where('status', 'aktif')
                    ->first();

                if (!$currentMembership) {
                    continue;
                }

                if ($action === 'naik_kelas') {
                    if (!$targetGroup) {
                        throw new \Exception('Rombel tujuan wajib dipilih untuk aksi Naik Kelas.');
                    }

                    // 1. Tutup status rombel lama
                    $currentMembership->update([
                        'status'  => 'selesai',
                        'left_at' => today(),
                        'note'    => $note ?? "Selesai di {$sourceGroup->name}, naik ke {$targetGroup->name}",
                    ]);

                    // 2. Buat keanggotaan baru di rombel tujuan (update jika sudah ada record)
                    StudentClass::updateOrCreate(
                        [
                            'student_id'     => $studentId,
                            'class_group_id' => $targetGroup->id,
                        ],
                        [
                            'academic_year_id'          => $targetAcademicYearId,
                            'educational_institution_id'=> $targetGroup->educational_institution_id,
                            'joined_at'                 => today(),
                            'status'                    => 'aktif',
                            'note'                      => $note ?? "Naik kelas dari {$sourceGroup->name}",
                        ]
                    );

                    $promotedCount++;
                } elseif ($action === 'tinggal_kelas') {
                    // Update catatan tinggal kelas
                    $currentMembership->update([
                        'note' => $note ?? "Tinggal kelas di {$sourceGroup->name}",
                    ]);
                    $retainedCount++;
                } elseif ($action === 'lulus') {
                    // 1. Tutup rombel
                    $currentMembership->update([
                        'status'  => 'selesai',
                        'left_at' => today(),
                        'note'    => $note ?? "Lulus pendidikan dari {$sourceGroup->name}",
                    ]);

                    // 2. Ubah status santri menjadi lulus
                    Student::where('id', $studentId)->update([
                        'status' => 'lulus',
                    ]);

                    $graduatedCount++;
                }
            }

            DB::commit();

            return response()->json([
                'status'  => 'success',
                'message' => "Proses berhasil: {$promotedCount} naik kelas, {$retainedCount} tinggal kelas, {$graduatedCount} lulus.",
                'data'    => [
                    'promoted'  => $promotedCount,
                    'retained'  => $retainedCount,
                    'graduated' => $graduatedCount,
                ],
            ], 200);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing bulk promotion: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memproses kenaikan kelas: ' . $e->getMessage(),
            ], 500);
        }
    }
}
