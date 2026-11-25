<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('lesson_hours', 'program_id')) {
            Schema::table('lesson_hours', function (Blueprint $table) {
                $table->foreignId('program_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('programs')
                    ->nullOnDelete();
            });
        }

        // Backfill program_id dari educational_institutions jika sebelumnya pernah diisi
        if (Schema::hasColumn('lesson_hours', 'educational_institution_id')) {
            $hoursWithInst = DB::table('lesson_hours')
                ->whereNotNull('educational_institution_id')
                ->whereNull('program_id')
                ->get(['id', 'educational_institution_id']);

            foreach ($hoursWithInst as $row) {
                $progId = DB::table('educational_institutions')
                    ->where('id', $row->educational_institution_id)
                    ->value('program_id');

                if ($progId) {
                    DB::table('lesson_hours')
                        ->where('id', $row->id)
                        ->update(['program_id' => $progId]);
                }
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('lesson_hours', 'program_id')) {
            Schema::table('lesson_hours', function (Blueprint $table) {
                $table->dropForeign(['program_id']);
                $table->dropColumn('program_id');
            });
        }
    }
};
