<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('education_classes') && !Schema::hasColumn('education_classes', 'education_id')) {
            Schema::table('education_classes', function (Blueprint $table) {
                $table->foreignId('education_id')->nullable()->after('id')->constrained('educations')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('education_classes') && Schema::hasColumn('education_classes', 'education_id')) {
            Schema::table('education_classes', function (Blueprint $table) {
                $table->dropForeign(['education_id']);
                $table->dropColumn('education_id');
            });
        }
    }
};
