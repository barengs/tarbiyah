<?php

namespace App\Services;

use App\Models\Student;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BankSantriService
{
    protected string $baseUrl;
    protected string $internalKey;

    public function __construct()
    {
        $this->baseUrl     = rtrim(config('services.bank_santri.url', 'http://localhost:8001'), '/');
        $this->internalKey = config('services.bank_santri.internal_key', 'smpt-banksantri-internal-secret-2026');
    }

    /**
     * Cek kelayakan ujian santri berdasarkan status tunggakan di Bank Santri.
     *
     * Aturan Bisnis:
     * - Siswa reguler luar (is_mukim = false) tidak terikat tagihan pesantren -> Otomatis Layak.
     * - Santri mukim (is_mukim = true) dicek ke Bank Santri melalui nomor rekening (= NIS).
     */
    public function checkExamEligibility(Student $student): array
    {
        // 1. Siswa Luar (Kalong / Non-Mukim)
        if (!$student->is_mukim) {
            return [
                'eligible'        => true,
                'status'          => 'cleared',
                'reason'          => 'Siswa Reguler Luar (Non-Mukim)',
                'total_arrears'   => 0,
                'overdue_count'   => 0,
                'details'         => [],
            ];
        }

        // 2. Santri Mukim: Cek ke Bank Santri
        try {
            $url = "{$this->baseUrl}/api/internal/account/{$student->nis}/arrears";
            $response = Http::timeout(5)
                ->withHeaders([
                    'X-Internal-Key' => $this->internalKey,
                    'Accept'         => 'application/json',
                ])
                ->get($url);

            if ($response->successful()) {
                $data = $response->json('data') ?? [];
                $totalArrears = (float) ($data['total_arrears'] ?? $data['total_amount'] ?? 0);
                $overdueCount = (int) ($data['overdue_bills_count'] ?? $data['unpaid_count'] ?? 0);

                $eligible = ($totalArrears <= 0);

                return [
                    'eligible'      => $eligible,
                    'status'        => $eligible ? 'cleared' : 'has_arrears',
                    'reason'        => $eligible ? 'Administrasi Lunas' : 'Terdapat tagihan belum lunas',
                    'total_arrears' => $totalArrears,
                    'overdue_count' => $overdueCount,
                    'details'       => $data,
                ];
            }

            // Jika rekening belum ditemukan di bank-santri (misal santri baru belum sinkron)
            if ($response->status() === 404) {
                return [
                    'eligible'      => true,
                    'status'        => 'not_registered',
                    'reason'        => 'Rekening belum terdaftar di Bank Santri (Dispensasi Otomatis)',
                    'total_arrears' => 0,
                    'overdue_count' => 0,
                    'details'       => [],
                ];
            }

            Log::warning("Bank Santri returned {$response->status()} for NIS {$student->nis}");
        } catch (\Exception $e) {
            Log::error("Gagal menghubungi Bank Santri untuk NIS {$student->nis}: " . $e->getMessage());
        }

        // Fallback jika bank-santri offline / error koneksi: beri dispensasi peringatan
        return [
            'eligible'      => true,
            'status'        => 'offline_bypass',
            'reason'        => 'Layanan Bank Santri tidak terjangkau (Dispensasi Sistem)',
            'total_arrears' => 0,
            'overdue_count' => 0,
            'details'       => [],
        ];
    }
}
