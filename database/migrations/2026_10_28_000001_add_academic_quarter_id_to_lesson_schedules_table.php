<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('lesson_schedules', 'academic_quarter_id')) {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->foreignId('academic_quarter_id')
                    ->nullable()
                    ->after('academic_year_id')
                    ->constrained('academic_quarters')
                    ->cascadeOnDelete();
            });
        }

        // Hubungkan jadwal lama yang belum memiliki quarter ke quarter aktif
        $activeQuarter = DB::table('academic_quarters')->where('active', true)->first()
            ?? DB::table('academic_quarters')->orderBy('id')->first();
        if ($activeQuarter) {
            DB::table('lesson_schedules')
                ->whereNull('academic_quarter_id')
                ->update(['academic_quarter_id' => $activeQuarter->id]);
        }

        // Tambahkan index pendukung academic_year_id jika belum ada agar foreign key tidak mengunci unique clash index lama
        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->index('academic_year_id', 'ls_academic_year_idx');
            });
        } catch (\Throwable $e) {
            // Already created
        }

        // Perbarui unique index clash untuk memperhitungkan academic_quarter_id
        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->dropUnique('schedule_clash_unique');
            });
        } catch (\Throwable $e) {
            // Ignore if already dropped
        }

        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->unique(
                    ['academic_year_id', 'academic_quarter_id', 'class_group_id', 'day', 'lesson_hour_id'],
                    'schedule_quarter_clash_unique'
                );
            });
        } catch (\Throwable $e) {
            // Ignore if already exists
        }
    }

    public function down(): void
    {
        Schema::table('lesson_schedules', function (Blueprint $table) {
            try {
                $table->dropUnique('schedule_quarter_clash_unique');
            } catch (\Throwable $e) {
            }

            try {
                $table->unique(['academic_year_id', 'class_group_id', 'day', 'lesson_hour_id'], 'schedule_clash_unique');
            } catch (\Throwable $e) {
            }

            try {
                $table->dropIndex('ls_academic_year_idx');
            } catch (\Throwable $e) {
            }

            if (Schema::hasColumn('lesson_schedules', 'academic_quarter_id')) {
                $table->dropForeign(['academic_quarter_id']);
                $table->dropColumn('academic_quarter_id');
            }
        });
    }
};
