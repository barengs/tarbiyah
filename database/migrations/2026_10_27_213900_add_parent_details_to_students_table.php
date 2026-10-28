<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->string('father_name')->nullable()->after('parent_phone');
            $table->string('father_nik', 30)->nullable()->after('father_name');
            $table->string('father_job')->nullable()->after('father_nik');
            $table->string('father_phone', 30)->nullable()->after('father_job');

            $table->string('mother_name')->nullable()->after('father_phone');
            $table->string('mother_nik', 30)->nullable()->after('mother_name');
            $table->string('mother_job')->nullable()->after('mother_nik');
            $table->string('mother_phone', 30)->nullable()->after('mother_job');

            $table->string('guardian_name')->nullable()->after('mother_phone');
            $table->string('guardian_nik', 30)->nullable()->after('guardian_name');
            $table->string('guardian_relation')->nullable()->after('guardian_nik');
            $table->string('guardian_job')->nullable()->after('guardian_relation');
            $table->string('guardian_phone', 30)->nullable()->after('guardian_job');
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'father_name',
                'father_nik',
                'father_job',
                'father_phone',
                'mother_name',
                'mother_nik',
                'mother_job',
                'mother_phone',
                'guardian_name',
                'guardian_nik',
                'guardian_relation',
                'guardian_job',
                'guardian_phone',
            ]);
        });
    }
};
