<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('schedule_periods')) {
            Schema::create('schedule_periods', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
                $table->foreignId('academic_quarter_id')->nullable()->constrained('academic_quarters')->nullOnDelete();
                $table->string('name', 150);
                $table->text('description')->nullable();
                $table->date('effective_start_date')->nullable();
                $table->date('effective_end_date')->nullable();
                $table->boolean('is_active')->default(false);
                $table->timestamp('activated_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();

                $table->index(['academic_year_id', 'academic_quarter_id', 'is_active'], 'sp_year_quarter_active_idx');
            });
        }

        if (! Schema::hasColumn('lesson_schedules', 'schedule_period_id')) {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->foreignId('schedule_period_id')
                    ->nullable()
                    ->after('academic_quarter_id')
                    ->constrained('schedule_periods')
                    ->cascadeOnDelete();
            });
        }

        // Backfill jadwal lama yang belum memiliki schedule_period_id ke periode jadwal aktif bawaan
        $existingGroups = DB::table('lesson_schedules')
            ->whereNull('schedule_period_id')
            ->select('academic_year_id', 'academic_quarter_id')
            ->distinct()
            ->get();

        foreach ($existingGroups as $grp) {
            $year = DB::table('academic_years')->where('id', $grp->academic_year_id)->first();
            $quarter = $grp->academic_quarter_id
                ? DB::table('academic_quarters')->where('id', $grp->academic_quarter_id)->first()
                : null;

            $periodName = 'Jadwal Periode '.($year->year ?? $grp->academic_year_id);
            if ($quarter) {
                $periodName .= ' - '.$quarter->name;
            }

            $periodId = DB::table('schedule_periods')->insertGetId([
                'academic_year_id' => $grp->academic_year_id,
                'academic_quarter_id' => $grp->academic_quarter_id,
                'name' => mb_substr($periodName, 0, 150),
                'description' => 'Jadwal aktif hasil migrasi otomatis data sebelumnya',
                'effective_start_date' => $quarter?->start_date ?? $year?->start_date,
                'effective_end_date' => $quarter?->end_date ?? $year?->end_date,
                'is_active' => true,
                'activated_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $updateQuery = DB::table('lesson_schedules')
                ->whereNull('schedule_period_id')
                ->where('academic_year_id', $grp->academic_year_id);

            if ($grp->academic_quarter_id) {
                $updateQuery->where('academic_quarter_id', $grp->academic_quarter_id);
            } else {
                $updateQuery->whereNull('academic_quarter_id');
            }

            $updateQuery->update(['schedule_period_id' => $periodId]);
        }

        // Pastikan index FK terpisah ada sebelum drop unique index lama di MySQL
        foreach (['academic_quarter_id', 'class_group_id', 'lesson_hour_id'] as $col) {
            try {
                Schema::table('lesson_schedules', function (Blueprint $table) use ($col) {
                    $table->index($col, "ls_{$col}_idx");
                });
            } catch (\Throwable $e) {
                // Sudah ada
            }
        }

        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->dropUnique('schedule_quarter_clash_unique');
            });
        } catch (\Throwable $e) {
            // Abaikan jika sudah di-drop
        }

        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->dropUnique('schedule_clash_unique');
            });
        } catch (\Throwable $e) {
            // Abaikan jika sudah di-drop
        }

        try {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                $table->unique(
                    ['schedule_period_id', 'class_group_id', 'day', 'lesson_hour_id'],
                    'schedule_period_clash_unique'
                );
            });
        } catch (\Throwable $e) {
            // Sudah ada
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('lesson_schedules')) {
            Schema::table('lesson_schedules', function (Blueprint $table) {
                try {
                    $table->dropUnique('schedule_period_clash_unique');
                } catch (\Throwable $e) {
                }

                if (Schema::hasColumn('lesson_schedules', 'schedule_period_id')) {
                    try {
                        $table->dropForeign(['schedule_period_id']);
                    } catch (\Throwable $e) {
                    }
                    $table->dropColumn('schedule_period_id');
                }

                try {
                    $table->unique(
                        ['academic_year_id', 'academic_quarter_id', 'class_group_id', 'day', 'lesson_hour_id'],
                        'schedule_quarter_clash_unique'
                    );
                } catch (\Throwable $e) {
                }
            });
        }

        Schema::dropIfExists('schedule_periods');
    }
};
