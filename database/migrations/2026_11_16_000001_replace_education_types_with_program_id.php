<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('educational_institutions') && ! Schema::hasColumn('educational_institutions', 'program_id')) {
            Schema::table('educational_institutions', function (Blueprint $table) {
                $table->foreignId('program_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('programs')
                    ->nullOnDelete();
            });
        }

        // Backfill program_id pada educational_institutions dari educations yang berelasi
        if (Schema::hasTable('educational_institutions') && Schema::hasTable('educations')) {
            $educations = DB::table('educations')
                ->whereNotNull('educational_institution_id')
                ->whereNotNull('program_id')
                ->get(['educational_institution_id', 'program_id']);

            foreach ($educations as $edu) {
                DB::table('educational_institutions')
                    ->where('id', $edu->educational_institution_id)
                    ->whereNull('program_id')
                    ->update(['program_id' => $edu->program_id]);
            }
        }

        // Backfill fallback berdasarkan nama program (Tibyan / Kubar)
        if (Schema::hasTable('programs') && Schema::hasTable('educational_institutions')) {
            $tibyanId = DB::table('programs')->whereRaw('LOWER(name) LIKE ?', ['%tibyan%'])->value('id');
            $kubarId = DB::table('programs')->whereRaw('LOWER(name) LIKE ?', ['%kubar%'])->value('id');

            if ($tibyanId) {
                DB::table('educational_institutions')
                    ->whereNull('program_id')
                    ->where(function ($q) {
                        $q->whereRaw('LOWER(name) LIKE ?', ['%tibyan%'])
                            ->orWhereRaw('LOWER(name) LIKE ?', ['%takhossus%']);
                    })
                    ->update(['program_id' => $tibyanId]);
            }

            if ($kubarId) {
                DB::table('educational_institutions')
                    ->whereNull('program_id')
                    ->where(function ($q) {
                        $q->whereRaw('LOWER(name) LIKE ?', ['%kubar%'])
                            ->orWhereRaw('LOWER(name) LIKE ?', ['%ula%'])
                            ->orWhereRaw('LOWER(name) LIKE ?', ['%wustha%'])
                            ->orWhereRaw('LOWER(name) LIKE ?', ['%ulya%']);
                    })
                    ->update(['program_id' => $kubarId]);
            }
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('educational_institutions') && Schema::hasColumn('educational_institutions', 'program_id')) {
            Schema::table('educational_institutions', function (Blueprint $table) {
                $table->dropForeign(['program_id']);
                $table->dropColumn('program_id');
            });
        }
    }
};
