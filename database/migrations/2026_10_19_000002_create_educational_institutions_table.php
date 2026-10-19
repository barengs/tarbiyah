<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('educational_institutions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('education_type_id')->nullable()->constrained('education_types')->nullOnDelete();
            $table->string('registration_number')->unique()->nullable(); // NSP/NPSN
            $table->string('name');
            $table->string('short_name', 30)->nullable(); // MTs, MA, SMP, Tahfidz
            $table->enum('progression_type', ['semester', 'leveling'])->default('semester'); // Kenaikan semester vs leveling mingguan
            $table->string('address')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('logo')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('headmaster_id')->nullable();
            $table->string('headmaster_name')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educational_institutions');
    }
};
