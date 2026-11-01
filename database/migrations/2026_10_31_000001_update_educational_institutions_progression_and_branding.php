<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Perluas opsi enum progression_type agar menyertakan 'triwulan' (standar pondok pesantren)
        DB::statement("ALTER TABLE educational_institutions MODIFY COLUMN progression_type ENUM('triwulan', 'semester', 'leveling') NOT NULL DEFAULT 'triwulan'");

        // 2. Tambah kolom letterhead (kop surat resmi lembaga) setelah kolom logo
        Schema::table('educational_institutions', function (Blueprint $table) {
            if (!Schema::hasColumn('educational_institutions', 'letterhead')) {
                $table->string('letterhead')->nullable()->after('logo');
            }
        });

        // 3. Update institusi pesantren default (Kubar & Tibyan) menjadi 'triwulan'
        DB::table('educational_institutions')
            ->whereIn('short_name', ['Kubar', 'Tibyan'])
            ->update(['progression_type' => 'triwulan']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('educational_institutions', function (Blueprint $table) {
            if (Schema::hasColumn('educational_institutions', 'letterhead')) {
                $table->dropColumn('letterhead');
            }
        });

        DB::statement("ALTER TABLE educational_institutions MODIFY COLUMN progression_type ENUM('semester', 'leveling') NOT NULL DEFAULT 'semester'");
    }
};

