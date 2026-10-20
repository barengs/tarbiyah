<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('studies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('educational_institution_id')->nullable()->constrained('educational_institutions')->nullOnDelete();
            $table->string('code', 20)->nullable();
            $table->string('name');
            $table->decimal('kkm', 5, 2)->default(75.00);
            $table->integer('order')->default(1);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // Relasi guru mengampu mata pelajaran
        Schema::create('teacher_studies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('teachers')->cascadeOnDelete();
            $table->foreignId('study_id')->constrained('studies')->cascadeOnDelete();
            $table->unique(['teacher_id', 'study_id']);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teacher_studies');
        Schema::dropIfExists('studies');
    }
};
