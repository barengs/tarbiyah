<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('schedule_periods') && ! Schema::hasColumn('schedule_periods', 'program_id')) {
            Schema::table('schedule_periods', function (Blueprint $table) {
                $table->foreignId('program_id')
                    ->nullable()
                    ->after('academic_quarter_id')
                    ->constrained('programs')
                    ->nullOnDelete();
                $table->index('program_id', 'sp_program_idx');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('schedule_periods') && Schema::hasColumn('schedule_periods', 'program_id')) {
            Schema::table('schedule_periods', function (Blueprint $table) {
                try {
                    $table->dropIndex('sp_program_idx');
                } catch (\Throwable $e) {
                }
                try {
                    $table->dropForeign(['program_id']);
                } catch (\Throwable $e) {
                }
                $table->dropColumn('program_id');
            });
        }
    }
};
