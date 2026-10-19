<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('students', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('santri_id')->nullable()->index(); // ID santri di smpt (untuk 90% santri mukim)
            $table->string('nis', 50)->unique(); // Nomor Induk Siswa di madrasah/sekolah
            $table->string('nisn', 50)->nullable()->index(); // Nomor Induk Siswa Nasional
            $table->string('nik', 30)->nullable();
            $table->string('name');
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->boolean('is_mukim')->default(true); // true = Santri Mukim (90%), false = Siswa Reguler Luar (10%)
            $table->string('born_in')->nullable();
            $table->date('born_at')->nullable();
            $table->string('parent_name')->nullable();
            $table->string('parent_phone', 30)->nullable();
            $table->text('address')->nullable();
            $table->string('photo')->nullable();
            $table->enum('status', ['aktif', 'lulus', 'mutasi', 'keluar'])->default('aktif');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
