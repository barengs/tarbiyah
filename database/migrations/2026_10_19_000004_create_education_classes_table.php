<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('education_classes', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // A, B, C, Ikhwan, Akhwat
            $table->string('name'); // Kelas A, Kelas B, Halaqah 1
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('education_classes');
    }
};
