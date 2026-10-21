<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sinkronisasi tabel class_groups dan student_classes agar sama persis dengan sistem smpt:
     * - class_groups: advisor_id
     * - student_classes: classroom_id, approval_status, approval_note, approved_by
     */
    public function up(): void
    {
        Schema::table('class_groups', function (Blueprint $table) {
            if (!Schema::hasColumn('class_groups', 'advisor_id')) {
                $table->unsignedBigInteger('advisor_id')->nullable()->after('homeroom_teacher_id');
            }
        });

        Schema::table('student_classes', function (Blueprint $table) {
            if (!Schema::hasColumn('student_classes', 'classroom_id')) {
                $table->foreignId('classroom_id')->nullable()->after('class_group_id')->constrained('classrooms')->nullOnDelete();
            }
            if (!Schema::hasColumn('student_classes', 'approval_status')) {
                $table->enum('approval_status', ['diajukan', 'disetujui', 'ditolak'])->default('disetujui')->after('status');
            }
            if (!Schema::hasColumn('student_classes', 'approval_note')) {
                $table->string('approval_note')->nullable()->after('approval_status');
            }
            if (!Schema::hasColumn('student_classes', 'approved_by')) {
                $table->foreignId('approved_by')->nullable()->after('approval_note')->constrained('users')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('class_groups', function (Blueprint $table) {
            $table->dropColumn('advisor_id');
        });

        Schema::table('student_classes', function (Blueprint $table) {
            $table->dropForeign(['classroom_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn(['classroom_id', 'approval_status', 'approval_note', 'approved_by']);
        });
    }
};
