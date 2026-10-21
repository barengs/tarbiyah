<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sinkronisasi tabel educational_institutions agar kolom-kolomnya sama persis dengan sistem smpt:
     * - institution_name, institution_address, institution_phone, institution_email,
     *   institution_website, institution_logo, institution_banner, institution_status,
     *   institution_description, education_id, education_class_id, program_id
     */
    public function up(): void
    {
        Schema::table('educational_institutions', function (Blueprint $table) {
            if (!Schema::hasColumn('educational_institutions', 'institution_name')) {
                $table->string('institution_name')->nullable()->after('name');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_address')) {
                $table->string('institution_address')->nullable()->after('address');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_phone')) {
                $table->string('institution_phone')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_email')) {
                $table->string('institution_email')->nullable()->after('email');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_website')) {
                $table->string('institution_website')->nullable()->after('website');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_logo')) {
                $table->string('institution_logo')->nullable()->after('logo');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_banner')) {
                $table->string('institution_banner')->nullable()->after('institution_logo');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_status')) {
                $table->enum('institution_status', ['active', 'inactive'])->default('active')->nullable()->after('status');
            }
            if (!Schema::hasColumn('educational_institutions', 'institution_description')) {
                $table->string('institution_description')->nullable()->after('description');
            }
            if (!Schema::hasColumn('educational_institutions', 'education_id')) {
                $table->unsignedBigInteger('education_id')->nullable()->after('id');
            }
            if (!Schema::hasColumn('educational_institutions', 'education_class_id')) {
                $table->unsignedBigInteger('education_class_id')->nullable()->after('education_id');
            }
            if (!Schema::hasColumn('educational_institutions', 'program_id')) {
                $table->unsignedBigInteger('program_id')->nullable()->after('education_class_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('educational_institutions', function (Blueprint $table) {
            $table->dropColumn([
                'institution_name', 'institution_address', 'institution_phone', 'institution_email',
                'institution_website', 'institution_logo', 'institution_banner', 'institution_status',
                'institution_description', 'education_id', 'education_class_id', 'program_id'
            ]);
        });
    }
};
