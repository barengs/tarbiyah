<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migrasi sistem penilaian persis sama dengan sistem smpt:
     * - assessment_formulas
     * - student_assessments
     * - Penyesuaian assessment_scores (menambah: student_assessment_id, component, sequence,
     *   date, description — kolom-kolom dari smpt agar migrasi 1:1 dapat dilakukan)
     */
    public function up(): void
    {
        if (!Schema::hasTable('assessment_formulas')) {
            Schema::create('assessment_formulas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_schedule_detail_id')->constrained('class_schedule_details')->onDelete('cascade');
                $table->string('name')->default('Standar K13');
                $table->enum('type', ['standar_k13', 'merdeka', 'custom'])->default('standar_k13');
                $table->json('knowledge_formula')->nullable();
                $table->json('skill_formula')->nullable();
                $table->decimal('attendance_weight', 5, 2)->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('student_assessments')) {
            Schema::create('student_assessments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_schedule_detail_id')->constrained('class_schedule_details')->onDelete('cascade');
                $table->foreignId('student_id')->constrained('students')->onDelete('cascade');
                $table->foreignId('academic_year_id')->constrained('academic_years')->onDelete('cascade');
                $table->foreignId('academic_quarter_id')->nullable()->constrained('academic_quarters')->nullOnDelete();
                $table->enum('attitude_spiritual', ['A', 'B', 'C', 'D'])->nullable();
                $table->enum('attitude_social', ['A', 'B', 'C', 'D'])->nullable();
                $table->text('attitude_description')->nullable();
                $table->decimal('final_knowledge_score', 5, 2)->nullable();
                $table->decimal('final_skill_score', 5, 2)->nullable();
                $table->decimal('final_score', 5, 2)->nullable();
                $table->timestamps();

                $table->unique(['class_schedule_detail_id', 'student_id', 'academic_quarter_id'], 'stu_assessment_quarter_unique');
            });
        }

        Schema::table('assessment_scores', function (Blueprint $table) {
            if (!Schema::hasColumn('assessment_scores', 'student_assessment_id')) {
                $table->foreignId('student_assessment_id')->nullable()->after('id')->constrained('student_assessments')->nullOnDelete();
            }
            if (!Schema::hasColumn('assessment_scores', 'component')) {
                $table->string('component')->nullable()->after('student_assessment_id');
            }
            if (!Schema::hasColumn('assessment_scores', 'sequence')) {
                $table->integer('sequence')->default(1)->after('component');
            }
            if (!Schema::hasColumn('assessment_scores', 'date')) {
                $table->date('date')->nullable()->after('score');
            }
            if (!Schema::hasColumn('assessment_scores', 'description')) {
                $table->string('description')->nullable()->after('date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('assessment_scores', function (Blueprint $table) {
            $table->dropForeign(['student_assessment_id']);
            $table->dropColumn(['student_assessment_id', 'component', 'sequence', 'date', 'description']);
        });

        Schema::dropIfExists('student_assessments');
        Schema::dropIfExists('assessment_formulas');
    }
};
