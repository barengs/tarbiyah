<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Keanggotaan siswa dalam rombongan belajar (Rombel).
     *
     * Mendukung dua model kenaikan kelas:
     *  - Model Semesteran (Formal: SMP/SMA/MTs/MA): satu siswa satu rombel aktif per tahun ajaran.
     *  - Model Leveling (Tahfidz): kenaikan level/halaqah dapat terjadi setiap minggu ketika
     *    milestone hafalan tercapai. Riwayat perpindahan level direkam melalui perpindahan
     *    status (selesai -> pindah_level) dan penambahan rombel baru dengan joined_at baru.
     */
    public function up(): void
    {
        Schema::create('student_classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('educational_institution_id')->constrained('educational_institutions')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->date('joined_at')->nullable();
            $table->date('left_at')->nullable();
            $table->enum('status', ['aktif', 'selesai', 'pindah_level', 'keluar'])->default('aktif');
            $table->string('note')->nullable();
            $table->timestamps();

            // Satu siswa hanya boleh punya satu keanggotaan AKTIF per rombel
            $table->unique(['student_id', 'class_group_id']);
        });

        // Penugasan guru mengajar mapel di rombel tertentu (jadwal & presensi KBM)
        Schema::create('class_group_subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
            $table->foreignId('teacher_id')->nullable()->constrained('teachers')->nullOnDelete();
            $table->unique(['class_group_id', 'study_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_group_subjects');
        Schema::dropIfExists('student_classes');
    }
};
