<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambahkan academic_quarter_id pada tabel assessments
        if (!Schema::hasColumn('assessments', 'academic_quarter_id')) {
            Schema::table('assessments', function (Blueprint $table) {
                $table->foreignId('academic_quarter_id')
                    ->nullable()
                    ->after('academic_year_id')
                    ->constrained('academic_quarters')
                    ->nullOnDelete();
            });
        }

        // 2. Tambahkan academic_quarter_id pada tabel report_cards & ubah kolom semester menjadi string (mendukung triwulan_1..4)
        if (!Schema::hasColumn('report_cards', 'academic_quarter_id')) {
            Schema::table('report_cards', function (Blueprint $table) {
                $table->foreignId('academic_quarter_id')
                    ->nullable()
                    ->after('academic_year_id')
                    ->constrained('academic_quarters')
                    ->nullOnDelete();
            });
        }

        // Ubah tipe kolom semester dari ENUM('ganjil','genap') menjadi VARCHAR(50)
        DB::statement("ALTER TABLE report_cards MODIFY COLUMN semester VARCHAR(50) NOT NULL DEFAULT 'triwulan_4'");

        // 3. Backfill academic_quarter_id yang masih kosong ke kuartal aktif
        $activeQuarter = DB::table('academic_quarters')->where('active', true)->first()
            ?? DB::table('academic_quarters')->orderBy('id', 'desc')->first();

        if ($activeQuarter) {
            DB::table('assessments')
                ->whereNull('academic_quarter_id')
                ->update(['academic_quarter_id' => $activeQuarter->id]);

            DB::table('report_cards')
                ->whereNull('academic_quarter_id')
                ->update(['academic_quarter_id' => $activeQuarter->id]);
        }

        // 4. Nonaktifkan kategori penilaian tahfidz (tidak ada program Tahfidz di sistem ini)
        DB::table('assessment_categories')
            ->where('code', 'tahfidz')
            ->update(['is_active' => false]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('report_cards', 'academic_quarter_id')) {
            Schema::table('report_cards', function (Blueprint $table) {
                $table->dropForeign(['academic_quarter_id']);
                $table->dropColumn('academic_quarter_id');
            });
        }

        if (Schema::hasColumn('assessments', 'academic_quarter_id')) {
            Schema::table('assessments', function (Blueprint $table) {
                $table->dropForeign(['academic_quarter_id']);
                $table->dropColumn('academic_quarter_id');
            });
        }
    }
};

