<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sinkronisasi tabel students agar kolom-kolomnya sama persis dengan sistem smpt:
     * - parent_id, period, first_name, last_name, kk, last_education, village_id, village,
     *   district, postal_code, phone, hostel_id, program_id, user_id
     */
    public function up(): void
    {
        Schema::table('students', function (Blueprint $table) {
            if (!Schema::hasColumn('students', 'parent_id')) {
                $table->string('parent_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('students', 'period')) {
                $table->string('period')->nullable()->after('nis');
            }
            if (!Schema::hasColumn('students', 'kk')) {
                $table->string('kk')->nullable()->after('nik');
            }
            if (!Schema::hasColumn('students', 'first_name')) {
                $table->string('first_name')->nullable()->after('name');
            }
            if (!Schema::hasColumn('students', 'last_name')) {
                $table->string('last_name')->nullable()->after('first_name');
            }
            if (!Schema::hasColumn('students', 'last_education')) {
                $table->string('last_education')->nullable()->after('born_at');
            }
            if (!Schema::hasColumn('students', 'village_id')) {
                $table->unsignedBigInteger('village_id')->nullable()->after('address');
            }
            if (!Schema::hasColumn('students', 'village')) {
                $table->string('village')->nullable()->after('village_id');
            }
            if (!Schema::hasColumn('students', 'district')) {
                $table->string('district')->nullable()->after('village');
            }
            if (!Schema::hasColumn('students', 'postal_code')) {
                $table->string('postal_code')->nullable()->after('district');
            }
            if (!Schema::hasColumn('students', 'phone')) {
                $table->string('phone')->nullable()->after('parent_phone');
            }
            if (!Schema::hasColumn('students', 'hostel_id')) {
                $table->unsignedBigInteger('hostel_id')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('students', 'program_id')) {
                $table->unsignedBigInteger('program_id')->nullable()->after('hostel_id');
            }
            if (!Schema::hasColumn('students', 'user_id')) {
                $table->unsignedBigInteger('user_id')->nullable()->after('status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('students', function (Blueprint $table) {
            $table->dropColumn([
                'parent_id', 'period', 'kk', 'first_name', 'last_name', 'last_education',
                'village_id', 'village', 'district', 'postal_code', 'phone', 'hostel_id',
                'program_id', 'user_id'
            ]);
        });
    }
};
