<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('class_group_id')->constrained('class_groups')->cascadeOnDelete();
            $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->foreignId('lesson_hour_id')->constrained('lesson_hours')->cascadeOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained('classrooms')->nullOnDelete();
            $table->tinyInteger('day')->comment('1: Senin, 2: Selasa, 3: Rabu, 4: Kamis, 5: Jumat, 6: Sabtu, 7: Ahad');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Mencegah bentrok jadwal rombel di hari dan jam yang sama
            $table->unique(['academic_year_id', 'class_group_id', 'day', 'lesson_hour_id'], 'schedule_clash_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_schedules');
    }
};
