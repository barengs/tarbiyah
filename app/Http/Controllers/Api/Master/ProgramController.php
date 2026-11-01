<?php

namespace App\Http\Controllers\Api\Master;

use App\Http\Controllers\Controller;
use App\Models\Program;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ProgramController extends Controller
{
    /**
     * Tampilkan seluruh data program pesantren (Tibyan, Kubar, dll)
     */
    public function index()
    {
        try {
            $programs = Program::orderBy('id', 'asc')->get();

            return response()->json([
                'status'  => 'success',
                'message' => 'Data program pesantren berhasil dimuat',
                'data'    => $programs,
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error fetching programs: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memuat program pesantren: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Sinkronisasi master program pesantren dari aplikasi kepesantrenan (SMPT).
     * Memanggil internal endpoint GET /api/internal/programs dengan header X-Internal-Key.
     */
    public function syncFromSmpt()
    {
        $smptCoreUrl = config('services.smpt.core_url', 'http://localhost:8000');
        $internalKey = config('services.smpt.internal_key', 'smpt-tarbiyah-internal-secret-2026');

        try {
            $response = Http::timeout(10)->withHeaders([
                'X-Internal-Key' => $internalKey,
                'Accept'         => 'application/json',
            ])->get("{$smptCoreUrl}/api/internal/programs");

            if (!$response->successful()) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Gagal menghubungi SMPT: ' . $response->body(),
                ], $response->status() >= 400 && $response->status() < 600 ? $response->status() : 500);
            }

            $programsData = $response->json('data', []);
            $syncedCount = 0;

            foreach ($programsData as $item) {
                if (empty($item['id']) || empty($item['name'])) {
                    continue;
                }

                $code = strtoupper(substr(preg_replace('/[^a-zA-Z]/', '', $item['name']), 0, 3));
                if (str_contains(strtolower($item['name']), 'tibyan')) {
                    $code = 'TBY';
                } elseif (str_contains(strtolower($item['name']), 'kubar')) {
                    $code = 'KBR';
                }

                Program::updateOrCreate(
                    ['id' => $item['id']],
                    [
                        'name'        => $item['name'],
                        'code'        => $code,
                        'description' => $item['description'] ?? "Program Pesantren {$item['name']}",
                    ]
                );
                $syncedCount++;
            }

            return response()->json([
                'status'  => 'success',
                'message' => "Berhasil menyinkronkan {$syncedCount} program pesantren dari SMPT.",
                'data'    => Program::orderBy('id', 'asc')->get(),
            ], 200);
        } catch (\Exception $e) {
            Log::error('Error syncing programs from SMPT: ' . $e->getMessage());
            return response()->json([
                'status'  => 'error',
                'message' => 'Terjadi kesalahan saat menyinkronkan program dari SMPT: ' . $e->getMessage(),
            ], 500);
        }
    }
}
