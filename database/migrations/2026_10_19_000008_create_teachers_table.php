<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teachers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('staff_id')->nullable()->index(); // ID staf di smpt jika guru pesantren
            $table->string('nip', 50)->nullable()->unique();
            $table->string('name');
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->string('specialization')->nullable(); // Matematika, Fiqih, Tahfidz, dll
            $table->enum('status', ['tetap', 'honorer', 'luar'])->default('tetap'); // mendukung guru luar
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teachers');
    }
};
