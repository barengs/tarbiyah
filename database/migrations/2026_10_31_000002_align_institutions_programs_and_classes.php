<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambahkan foreign key educational_institution_id ke education_classes jika belum ada
        if (Schema::hasTable('education_classes') && !Schema::hasColumn('education_classes', 'educational_institution_id')) {
            Schema::table('education_classes', function (Blueprint $table) {
                $table->foreignId('educational_institution_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('educational_institutions')
                    ->nullOnDelete();
            });
        }

        // 1b. Perluas enum progression_type pada tabel class_groups agar mencakup 'triwulan'
        DB::statement("ALTER TABLE class_groups MODIFY COLUMN progression_type ENUM('triwulan', 'semester', 'leveling') NOT NULL DEFAULT 'triwulan'");

        // 2. Koreksi & Lengkapi Data Master Institusi Pendidikan (Institusi == Jenjang)
        // ID 1: Madrasah Diniyah Ula (MDU)
        DB::table('educational_institutions')->updateOrInsert(
            ['id' => 1],
            [
                'education_type_id'   => 1,
                'registration_number' => 'MDU-PANYEPPEN-01',
                'name'                => 'Madrasah Diniyah Ula',
                'short_name'          => 'Ula',
                'progression_type'    => 'triwulan',
                'description'         => 'Penyelenggara Pendidikan Diniyah Tingkat Dasar Pesantren',
                'headmaster_name'     => 'Ust. Dr. Muhammad Ridwan, M.A.',
                'status'              => 'active',
                'updated_at'          => now(),
            ]
        );

        // ID 2: Madrasah Diniyah Takhossus (MDTakhossus)
        DB::table('educational_institutions')->updateOrInsert(
            ['id' => 2],
            [
                'education_type_id'   => 2,
                'registration_number' => 'TKH-PANYEPPEN-04',
                'name'                => 'Madrasah Diniyah Takhossus',
                'short_name'          => 'Takhossus',
                'progression_type'    => 'triwulan',
                'description'         => 'Dirasah Salafiyah Pendalaman Kitab Kuning Pesantren',
                'headmaster_name'     => 'K.H. Mudatsir Badruddin',
                'status'              => 'active',
                'updated_at'          => now(),
            ]
        );

        // ID 3: Madrasah Diniyah Wustha (MDW)
        DB::table('educational_institutions')->updateOrInsert(
            ['id' => 3],
            [
                'education_type_id'   => 1,
                'registration_number' => 'MDW-PANYEPPEN-02',
                'name'                => 'Madrasah Diniyah Wustha',
                'short_name'          => 'Wustha',
                'progression_type'    => 'triwulan',
                'description'         => 'Penyelenggara Pendidikan Diniyah Tingkat Menengah Pesantren',
                'headmaster_name'     => 'Ust. Ahmad Zaki, S.Pd.I',
                'status'              => 'active',
                'created_at'          => now(),
                'updated_at'          => now(),
            ]
        );

        // ID 4: Madrasah Diniyah Ulya (MDUly)
        DB::table('educational_institutions')->updateOrInsert(
            ['id' => 4],
            [
                'education_type_id'   => 1,
                'registration_number' => 'MDY-PANYEPPEN-03',
                'name'                => 'Madrasah Diniyah Ulya',
                'short_name'          => 'Ulya',
                'progression_type'    => 'triwulan',
                'description'         => 'Penyelenggara Pendidikan Diniyah Tingkat Atas / Aliyah Pesantren',
                'headmaster_name'     => 'Ust. H. Abdullah Faqih, Lc.',
                'status'              => 'active',
                'created_at'          => now(),
                'updated_at'          => now(),
            ]
        );

        // 3. Selaraskan tabel educations agar berelasi 1:1 dengan institusi masing-masing
        // Ula -> Inst 1 (Program Kubar = 2)
        DB::table('educations')->where('id', 1)->update([
            'educational_institution_id' => 1,
            'program_id'                 => 2,
            'name'                       => 'Ula',
            'level'                      => 1,
            'updated_at'                 => now(),
        ]);
        // Wustha -> Inst 3 (Program Kubar = 2)
        DB::table('educations')->where('id', 2)->update([
            'educational_institution_id' => 3,
            'program_id'                 => 2,
            'name'                       => 'Wustha',
            'level'                      => 2,
            'updated_at'                 => now(),
        ]);
        // Ulya -> Inst 4 (Program Kubar = 2)
        DB::table('educations')->where('id', 3)->update([
            'educational_institution_id' => 4,
            'program_id'                 => 2,
            'name'                       => 'Ulya',
            'level'                      => 3,
            'updated_at'                 => now(),
        ]);
        // Takhossus -> Inst 2 (Program Tibyan = 1)
        DB::table('educations')->where('id', 4)->update([
            'educational_institution_id' => 2,
            'program_id'                 => 1,
            'name'                       => 'Takhossus',
            'level'                      => 1,
            'updated_at'                 => now(),
        ]);

        // 4. Update relasi educational_institution_id pada education_classes (Tingkat Kelas)
        DB::table('education_classes')->where('education_id', 1)->orWhere('code', 'like', 'ULA%')->update([
            'educational_institution_id' => 1,
        ]);
        DB::table('education_classes')->where('education_id', 2)->orWhere('code', 'like', 'WST%')->update([
            'educational_institution_id' => 3,
        ]);
        DB::table('education_classes')->where('education_id', 3)->orWhere('code', 'like', 'ULY%')->update([
            'educational_institution_id' => 4,
        ]);
        DB::table('education_classes')->where('education_id', 4)->orWhere('code', 'like', 'TK%')->update([
            'educational_institution_id' => 2,
        ]);

        // 5. Update relasi rombel (class_groups)
        // Rombel Ula (Kubar, Inst Ula)
        DB::table('class_groups')->where('education_id', 1)->orWhere('code', 'like', 'ULA%')->update([
            'educational_institution_id' => 1,
            'education_id'               => 1,
            'program_id'                 => 2,
            'progression_type'           => 'triwulan',
        ]);
        // Rombel Wustha (Kubar, Inst Wustha)
        DB::table('class_groups')->where('education_id', 2)->orWhere('code', 'like', 'WST%')->update([
            'educational_institution_id' => 3,
            'education_id'               => 2,
            'program_id'                 => 2,
            'progression_type'           => 'triwulan',
        ]);
        // Rombel Ulya (Kubar, Inst Ulya)
        DB::table('class_groups')->where('education_id', 3)->orWhere('code', 'like', 'ULY%')->update([
            'educational_institution_id' => 4,
            'education_id'               => 3,
            'program_id'                 => 2,
            'progression_type'           => 'triwulan',
        ]);
        // Rombel Takhossus (Tibyan, Inst Takhossus)
        DB::table('class_groups')->where('education_id', 4)->orWhere('code', 'like', 'TK%')->update([
            'educational_institution_id' => 2,
            'education_id'               => 4,
            'program_id'                 => 1,
            'progression_type'           => 'triwulan',
        ]);

        // 6. Update relasi classrooms (ruang kelas)
        DB::table('classrooms')->where('name', 'like', '%Ula%')->orWhere('code', 'like', '%ULA%')->update([
            'educational_institution_id' => 1,
        ]);
        DB::table('classrooms')->where('name', 'like', '%Wustha%')->orWhere('code', 'like', '%WST%')->update([
            'educational_institution_id' => 3,
        ]);
        DB::table('classrooms')->where('name', 'like', '%Ulya%')->orWhere('code', 'like', '%ULY%')->update([
            'educational_institution_id' => 4,
        ]);
        DB::table('classrooms')->where('name', 'like', '%Takhossus%')->orWhere('code', 'like', '%TK%')->update([
            'educational_institution_id' => 2,
        ]);

        // 7. Jadikan mapel umum berlaku di semua madrasah dengan educational_institution_id = null
        DB::table('studies')->update([
            'educational_institution_id' => null,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('education_classes') && Schema::hasColumn('education_classes', 'educational_institution_id')) {
            Schema::table('education_classes', function (Blueprint $table) {
                $table->dropForeign(['educational_institution_id']);
                $table->dropColumn('educational_institution_id');
            });
        }
    }
};
