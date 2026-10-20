<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_year_id')->constrained('academic_years')->cascadeOnDelete();
            $table->foreignId('educational_institution_id')->constrained('educational_institutions')->cascadeOnDelete();
            $table->foreignId('education_id')->nullable()->constrained('educations')->nullOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained('classrooms')->nullOnDelete();
            $table->foreignId('homeroom_teacher_id')->nullable()->constrained('teachers')->nullOnDelete();
            $table->string('code', 30)->nullable();
            $table->string('name');
            $table->enum('gender', ['L', 'P', 'campur'])->default('campur');
            $table->enum('progression_type', ['semester', 'leveling'])->default('semester');
            $table->string('target_level')->nullable();
            $table->integer('capacity')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['academic_year_id', 'code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_groups');
    }
};
