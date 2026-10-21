<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migrasi tabel KBM & Jadwal Pelajaran persis sama dengan sistem smpt:
     * - lesson_sessions
     * - class_schedules
     * - class_schedule_details
     * - meeting_schedules
     * - presences
     */
    public function up(): void
    {
        if (!Schema::hasTable('lesson_sessions')) {
            Schema::create('lesson_sessions', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->integer('order')->nullable();
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('class_schedules')) {
            Schema::create('class_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
                $table->foreignId('educational_institution_id')->constrained('educational_institutions')->onDelete('cascade');
                $table->foreignId('lesson_session_id')->nullable()->constrained('lesson_sessions')->nullOnDelete();
                $table->enum('status', ['active', 'inactive'])->default('active');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('class_schedule_details')) {
            Schema::create('class_schedule_details', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_schedule_id')->constrained('class_schedules', 'id')->cascadeOnDelete();
                $table->foreignId('classroom_id')->constrained('classrooms')->onDelete('cascade');
                $table->foreignId('class_group_id')->constrained('class_groups')->onDelete('cascade');
                $table->string('day')->nullable()->comment('senin, selasa, rabu, dll');
                $table->foreignId('lesson_hour_id')->constrained('lesson_hours', 'id')->cascadeOnDelete();
                $table->foreignId('teacher_id')->constrained('teachers', 'id')->cascadeOnDelete();
                $table->foreignId('study_id')->constrained('studies', 'id')->cascadeOnDelete();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('meeting_schedules')) {
            Schema::create('meeting_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_schedule_detail_id')->constrained('class_schedule_details')->onDelete('cascade');
                $table->string('meeting_sequence');
                $table->string('meeting_date');
                $table->text('topic')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('presences')) {
            Schema::create('presences', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('meeting_schedule_id')->constrained('meeting_schedules')->onDelete('cascade');
                $table->enum('status', ['hadir', 'izin', 'sakit', 'alpha']);
                $table->string('description')->nullable();
                $table->date('date')->nullable();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('presences');
        Schema::dropIfExists('meeting_schedules');
        Schema::dropIfExists('class_schedule_details');
        Schema::dropIfExists('class_schedules');
        Schema::dropIfExists('lesson_sessions');
    }
};
