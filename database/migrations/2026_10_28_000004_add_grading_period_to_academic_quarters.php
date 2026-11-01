<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('academic_quarters', function (Blueprint $table) {
            $table->date('grading_start_date')->nullable()->after('end_date');
            $table->date('grading_end_date')->nullable()->after('grading_start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('academic_quarters', function (Blueprint $table) {
            $table->dropColumn(['grading_start_date', 'grading_end_date']);
        });
    }
};

