<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classrooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('educational_institution_id')->nullable()->constrained('educational_institutions')->nullOnDelete();
            $table->string('name'); // Ruang 101, Lab Komputer, Gedung A
            $table->integer('capacity')->default(30);
            $table->string('description')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classrooms');
    }
};
