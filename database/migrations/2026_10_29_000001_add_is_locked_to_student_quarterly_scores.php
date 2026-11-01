<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('student_quarterly_scores')) {
            Schema::table('student_quarterly_scores', function (Blueprint $table) {
                if (!Schema::hasColumn('student_quarterly_scores', 'is_locked')) {
                    $table->boolean('is_locked')->default(false)->after('is_remedial');
                }
                if (!Schema::hasColumn('student_quarterly_scores', 'locked_at')) {
                    $table->timestamp('locked_at')->nullable()->after('is_locked');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('student_quarterly_scores')) {
            Schema::table('student_quarterly_scores', function (Blueprint $table) {
                $cols = [];
                if (Schema::hasColumn('student_quarterly_scores', 'is_locked')) {
                    $cols[] = 'is_locked';
                }
                if (Schema::hasColumn('student_quarterly_scores', 'locked_at')) {
                    $cols[] = 'locked_at';
                }
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }
    }
};

