<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Kategori Asesmen / Bobot Penilaian
        Schema::create('assessment_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Tugas Harian, UTS, UAS, Praktik, Hafalan Tahfidz
            $table->string('code', 20)->unique(); // tugas, uts, uas, praktik, tahfidz
            $table->decimal('weight', 5, 2)->default(20.00); // Bobot persentase kalkulasi nilai akhir
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Entitas Ujian / Tugas / Asesmen
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->foreignId('category_id')->constrained('assessment_categories')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('date');
            $table->decimal('max_score', 5, 2)->default(100.00);
            $table->timestamps();
            $table->softDeletes();
        });

        // Lembar Nilai Siswa per Asesmen
        Schema::create('assessment_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assessment_id')->constrained('assessments')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->decimal('score', 5, 2);
            $table->string('feedback')->nullable();
            $table->timestamps();

            $table->unique(['assessment_id', 'student_id']);
        });

        // Buku Rapor Digital Siswa
        Schema::create('report_cards', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->enum('semester', ['ganjil', 'genap'])->default('ganjil');
            $table->decimal('average_score', 5, 2)->nullable();
            $table->integer('rank')->nullable();
            $table->json('grades_summary')->nullable(); // Snapshot nilai per mata pelajaran & predikat
            $table->json('attendance_summary')->nullable(); // Snapshot kehadiran (hadir, sakit, izin, alpa)
            $table->text('homeroom_notes')->nullable(); // Catatan wali kelas
            $table->text('tahfidz_notes')->nullable(); // Capaian hafalan quran
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->unique(['academic_year_id', 'class_group_id', 'student_id', 'semester'], 'report_card_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_cards');
        Schema::dropIfExists('assessment_scores');
        Schema::dropIfExists('assessments');
        Schema::dropIfExists('assessment_categories');
    }
};
