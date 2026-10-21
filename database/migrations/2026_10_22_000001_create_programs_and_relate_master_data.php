<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Buat tabel programs jika belum ada
        if (!Schema::hasTable('programs')) {
            Schema::create('programs', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique(); // Kubar, Tibyan
                $table->string('code')->nullable(); // KBR, TBY
                $table->text('description')->nullable();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Tambahkan program_id ke educations (Jenjang)
        if (Schema::hasTable('educations') && !Schema::hasColumn('educations', 'program_id')) {
            Schema::table('educations', function (Blueprint $table) {
                $table->foreignId('program_id')->nullable()->after('educational_institution_id')->constrained('programs')->nullOnDelete();
            });
        }

        // 3. Tambahkan program_id & education_class_id ke class_groups (Rombel)
        if (Schema::hasTable('class_groups')) {
            Schema::table('class_groups', function (Blueprint $table) {
                if (!Schema::hasColumn('class_groups', 'program_id')) {
                    $table->foreignId('program_id')->nullable()->after('academic_year_id')->constrained('programs')->nullOnDelete();
                }
                if (!Schema::hasColumn('class_groups', 'education_class_id')) {
                    $table->foreignId('education_class_id')->nullable()->after('education_id')->constrained('education_classes')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('class_groups')) {
            Schema::table('class_groups', function (Blueprint $table) {
                if (Schema::hasColumn('class_groups', 'education_class_id')) {
                    $table->dropForeign(['education_class_id']);
                    $table->dropColumn('education_class_id');
                }
                if (Schema::hasColumn('class_groups', 'program_id')) {
                    $table->dropForeign(['program_id']);
                    $table->dropColumn('program_id');
                }
            });
        }

        if (Schema::hasTable('educations') && Schema::hasColumn('educations', 'program_id')) {
            Schema::table('educations', function (Blueprint $table) {
                $table->dropForeign(['program_id']);
                $table->dropColumn('program_id');
            });
        }

        Schema::dropIfExists('programs');
    }
};
