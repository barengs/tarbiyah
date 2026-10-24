<?php

namespace App\Http\Controllers\Api\Internal;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternalStudentController extends Controller
{
    /**
     * Endpoint untuk menerima sinkronisasi data santri dari SMPT backend.
     * Dipanggil dengan header X-Internal-Key.
     */
    public function sync(Request $request)
    {
        $validated = $request->validate([
            'santri_id'    => 'required|integer',
            'nis'          => 'required|string|max:255',
            'nik'          => 'nullable|string|max:30',
            'nisn'         => 'nullable|string|max:50',
            'name'         => 'required|string|max:255',
            'gender'       => 'required|in:L,P',
            'status'       => 'nullable|string',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
            'born_in'      => 'nullable|string|max:255',
            'born_at'      => 'nullable|date',
            'photo'        => 'nullable|string',
        ]);

        try {
            $statusMap = [
                'aktif'       => 'aktif',
                'lulus'       => 'lulus',
                'mutasi'      => 'mutasi',
                'keluar'      => 'keluar',
                'tugas'       => 'aktif',
                'dikeluarkan' => 'keluar',
                'tidak aktif' => 'keluar',
            ];
            $rawStatus = strtolower($validated['status'] ?? 'aktif');
            $status = $statusMap[$rawStatus] ?? 'aktif';

            $student = Student::updateOrCreate(
                ['nis' => $validated['nis']],
                [
                    'santri_id'    => $validated['santri_id'],
                    'nik'          => $validated['nik'] ?? null,
                    'nisn'         => $validated['nisn'] ?? null,
                    'name'         => $validated['name'],
                    'gender'       => $validated['gender'],
                    'is_mukim'     => true, // Santri dari SMPT selalu santri mukim
                    'parent_name'  => $validated['parent_name'] ?? null,
                    'parent_phone' => $validated['parent_phone'] ?? null,
                    'address'      => $validated['address'] ?? null,
                    'born_in'      => $validated['born_in'] ?? null,
                    'born_at'      => $validated['born_at'] ?? null,
                    'photo'        => $validated['photo'] ?? null,
                    'status'       => $status,
                ]
            );

            Log::info("Santri berhasil disinkronkan ke Tarbiyah: {$student->name} (NIS: {$student->nis})");

            return response()->json([
                'status'  => 'success',
                'message' => 'Santri berhasil disinkronkan',
                'data'    => $student,
            ], 200);
        } catch (\Exception $e) {
            Log::error("Gagal sinkronisasi santri ke Tarbiyah: " . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal sinkronisasi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Endpoint bulk sync: menerima daftar santri sekaligus dari SMPT
     * (dipakai saat migrasi penuh / backfill).
     */
    public function bulkSync(Request $request)
    {
        $validated = $request->validate([
            'students'                 => 'required|array',
            'students.*.santri_id'    => 'required|integer',
            'students.*.nis'          => 'required|string|max:255',
            'students.*.nik'          => 'nullable|string|max:30',
            'students.*.nisn'         => 'nullable|string|max:50',
            'students.*.name'         => 'required|string|max:255',
            'students.*.gender'       => 'required|in:L,P',
            'students.*.status'       => 'nullable|string',
            'students.*.parent_name'  => 'nullable|string|max:255',
            'students.*.parent_phone' => 'nullable|string|max:30',
            'students.*.address'      => 'nullable|string',
            'students.*.born_in'      => 'nullable|string|max:255',
            'students.*.born_at'      => 'nullable|date',
            'students.*.photo'        => 'nullable|string',
        ]);

        $created = 0;
        $updated = 0;

        foreach ($validated['students'] as $data) {
            $statusMap = [
                'aktif'       => 'aktif',
                'lulus'       => 'lulus',
                'mutasi'      => 'mutasi',
                'keluar'      => 'keluar',
                'tugas'       => 'aktif',
                'dikeluarkan' => 'keluar',
                'tidak aktif' => 'keluar',
            ];
            $rawStatus = strtolower($data['status'] ?? 'aktif');
            $status = $statusMap[$rawStatus] ?? 'aktif';

            $existing = Student::where('nis', $data['nis'])->first();
            $student = Student::updateOrCreate(
                ['nis' => $data['nis']],
                [
                    'santri_id'    => $data['santri_id'],
                    'nik'          => $data['nik'] ?? null,
                    'nisn'         => $data['nisn'] ?? null,
                    'name'         => $data['name'],
                    'gender'       => $data['gender'],
                    'is_mukim'     => true,
                    'parent_name'  => $data['parent_name'] ?? null,
                    'parent_phone' => $data['parent_phone'] ?? null,
                    'address'      => $data['address'] ?? null,
                    'born_in'      => $data['born_in'] ?? null,
                    'born_at'      => $data['born_at'] ?? null,
                    'photo'        => $data['photo'] ?? null,
                    'status'       => $status,
                ]
            );

            $existing ? $updated++ : $created++;
        }

        Log::info("Bulk sync dari SMPT: {$created} created, {$updated} updated.");

        return response()->json([
            'status'  => 'success',
            'message' => "Bulk sync selesai",
            'created' => $created,
            'updated' => $updated,
            'total'   => count($validated['students']),
        ], 200);
    }
}