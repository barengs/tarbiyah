<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academic_years', function (Blueprint $table) {
            $table->id();
            $table->string('year', 9)->unique(); // misal: 2026/2027
            $table->enum('type', ['semester', 'triwulan', 'custom'])->default('semester');
            $table->enum('periode', ['ganjil', 'genap', 'pendek'])->default('ganjil');
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('active')->default(false);
            $table->string('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_years');
    }
};
