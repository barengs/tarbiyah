<?php

namespace App\Http\Controllers\Api\Internal;

use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class InternalStudentController extends Controller
{
    /**
     * Endpoint untuk menerima sinkronisasi data santri dari SMPT backend
     * Dipanggil dengan header X-Internal-Key
     */
    public function sync(Request $request)
    {
        $validated = $request->validate([
            'santri_id'    => 'required|integer',
            'nis'          => 'required|string|max:50',
            'name'         => 'required|string|max:255',
            'gender'       => 'required|in:L,P',
            'status'       => 'nullable|string',
            'parent_name'  => 'nullable|string|max:255',
            'parent_phone' => 'nullable|string|max:30',
            'address'      => 'nullable|string',
        ]);

        try {
            $student = Student::updateOrCreate(
                ['nis' => $validated['nis']],
                [
                    'santri_id'    => $validated['santri_id'],
                    'name'         => $validated['name'],
                    'gender'       => $validated['gender'],
                    'is_mukim'     => true, // Santri yang disinkronkan dari SMPT adalah santri mukim
                    'parent_name'  => $validated['parent_name'] ?? null,
                    'parent_phone' => $validated['parent_phone'] ?? null,
                    'address'      => $validated['address'] ?? null,
                    'status'       => strtolower($validated['status'] ?? 'aktif') === 'aktif' ? 'aktif' : 'keluar',
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
}
