<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('educational_institution_id')->constrained('educational_institutions')->onDelete('cascade');
            $table->string('name'); // Kelas 7, Kelas 8, Level Juz 30, dsb
            $table->integer('level')->default(1); // Urutan tingkatan: 1, 2, 3...
            $table->string('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educations');
    }
};
