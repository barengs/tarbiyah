<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tambahkan kolom study_type pada tabel studies:
        //    - 'reguler'      : Mata Pelajaran Reguler (masuk jadwal KBM)
        //    - 'khusus'       : Mata Pelajaran Khusus (masuk jadwal KBM, wajib remidi bila nilai tidak memenuhi)
        //    - 'muatan_lokal' : Mata Pelajaran Non-Kelas / Muatan Lokal (TIDAK masuk jadwal KBM, penunjang nilai triwulan)
        if (!Schema::hasColumn('studies', 'study_type')) {
            Schema::table('studies', function (Blueprint $table) {
                $table->string('study_type', 30)->default('reguler')->after('name');
            });
        }

        // 2. Buat tabel student_quarterly_scores untuk menyimpan Nilai Akhir Triwulan & Remidi Mapel Khusus
        if (!Schema::hasTable('student_quarterly_scores')) {
            Schema::create('student_quarterly_scores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
                $table->foreignId('academic_quarter_id')->constrained('academic_quarters')->cascadeOnDelete();
                $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
                $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
                $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
                $table->decimal('original_score', 5, 2)->nullable(); // Nilai awal akhir triwulan sebelum remidi
                $table->decimal('remedial_score', 5, 2)->nullable(); // Nilai hasil remidi (khusus mapel khusus)
                $table->decimal('final_score', 5, 2)->default(0.00); // Nilai akhir yang dipakai
                $table->boolean('is_remedial')->default(false);      // Apakah pernah/sedang remidi
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->unique(
                    ['academic_quarter_id', 'class_group_id', 'student_id', 'study_id'],
                    'quarterly_score_unique'
                );
            });
        }

        // 3. Tambahkan kolom promotion_status & previous_average pada report_cards
        Schema::table('report_cards', function (Blueprint $table) {
            if (!Schema::hasColumn('report_cards', 'previous_average')) {
                $table->decimal('previous_average', 5, 2)->nullable()->after('average_score');
            }
            if (!Schema::hasColumn('report_cards', 'promotion_status')) {
                $table->string('promotion_status', 40)->default('layak_naik')->after('rank');
            }
        });
    }

    public function down(): void
    {
        Schema::table('report_cards', function (Blueprint $table) {
            if (Schema::hasColumn('report_cards', 'promotion_status')) {
                $table->dropColumn('promotion_status');
            }
            if (Schema::hasColumn('report_cards', 'previous_average')) {
                $table->dropColumn('previous_average');
            }
        });

        Schema::dropIfExists('student_quarterly_scores');

        if (Schema::hasColumn('studies', 'study_type')) {
            Schema::table('studies', function (Blueprint $table) {
                $table->dropColumn('study_type');
            });
        }
    }
};

