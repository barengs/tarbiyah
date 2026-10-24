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
            $table->unsignedBigInteger('santri_id')->nullable()->index(); // ID santri di smpt (untuk santri mukim)
            $table->string('parent_id', 30)->nullable()->index(); // NIK Wali Santri (FK dari parent_profiles.nik)
            $table->string('nis', 50)->unique(); // Nomor Induk Santri/Siswa tunggal (merangkap NISN Kemenag)
            $table->string('period', 20)->nullable(); // Periode / angkatan pendaftaran
            $table->string('nik', 30)->nullable()->index(); // NIK kependudukan santri
            $table->string('kk', 30)->nullable(); // Nomor Kartu Keluarga
            
            // Nama santri persis smpt
            $table->string('first_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('name')->nullable(); // Nama lengkap (cache / virtual)
            
            $table->enum('gender', ['L', 'P'])->default('L');
            $table->boolean('is_mukim')->default(true); // true = Santri Mukim (~90%), false = Siswa Reguler Luar (~10%)
            
            // Tempat, tanggal lahir, dan pendidikan asal
            $table->string('born_in')->nullable();
            $table->date('born_at')->nullable();
            $table->string('last_education')->nullable();
            
            // Alamat & Wilayah Kependudukan (Laravolt Indonesia)
            $table->text('address')->nullable();
            $table->unsignedBigInteger('village_id')->nullable()->index(); // Identifikasi wilayah dari NIK via Laravolt
            $table->string('village')->nullable();
            $table->string('district')->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('phone', 30)->nullable();
            
            // Snapshot Data Wali untuk Buku Rapor & Notifikasi Madrasah
            $table->string('parent_name')->nullable();
            $table->string('parent_phone', 30)->nullable();
            
            // Relasi Asrama & Program Pondok
            $table->unsignedBigInteger('hostel_id')->nullable()->index();
            $table->unsignedBigInteger('program_id')->nullable()->index();
            
            // Status santri selaras smpt & tarbiyah
            $table->enum('status', ['Tidak Aktif', 'Aktif', 'Tugas', 'Lulus', 'Dikeluarkan', 'Mutasi', 'Keluar'])->default('Aktif');
            $table->string('photo')->nullable();
            $table->unsignedBigInteger('user_id')->nullable()->index();
            
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('students');
    }
};
