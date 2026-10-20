<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Jurnal Pembelajaran / Pertemuan KBM Guru
        Schema::create('teaching_journals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->foreignId('lesson_schedule_id')->nullable()->constrained('lesson_schedules')->nullOnDelete();
            $table->integer('meeting_number')->default(1);
            $table->date('date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('topic');
            $table->text('notes')->nullable();
            $table->enum('teacher_status', ['hadir', 'izin', 'tugas', 'digantikan'])->default('hadir');
            $table->foreignId('substitute_teacher_id')->nullable()->constrained('teachers')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        // Presensi Siswa per Pertemuan KBM
        Schema::create('student_presences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teaching_journal_id')->constrained('teaching_journals')->cascadeOnDelete();
            $table->foreignId('student_id')->constrained('students')->cascadeOnDelete();
            $table->enum('status', ['hadir', 'sakit', 'izin', 'alpa'])->default('hadir');
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->unique(['teaching_journal_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_presences');
        Schema::dropIfExists('teaching_journals');
    }
};
