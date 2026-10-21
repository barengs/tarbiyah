<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Penyelarasan tipe data kolom inti akademik agar 1:1 dengan sistem smpt:
     * - students.status : enum disamakan dengan smpt ('Tidak Aktif','Aktif','Tugas','Lulus','Dikeluarkan')
     *   ditambah nilai fitur tarbiyah ('mutasi','keluar') sehingga superset — data smpt
     *   bisa dimigrasikan tanpa transformasi, dan fitur tarbiyah tetap jalan.
     * - students.nis, students.nik, students.address, studies.description : varchar(255) seperti smpt.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE students
            MODIFY status ENUM('Tidak Aktif','Aktif','Tugas','Lulus','Dikeluarkan','mutasi','keluar')
            NOT NULL DEFAULT 'Aktif'");

        DB::statement("ALTER TABLE students MODIFY nis VARCHAR(255) NOT NULL");
        DB::statement("ALTER TABLE students MODIFY nik VARCHAR(255) NULL");
        DB::statement("ALTER TABLE students MODIFY address VARCHAR(255) NULL");
        DB::statement("ALTER TABLE studies MODIFY description VARCHAR(255) NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE students
            MODIFY status ENUM('aktif','lulus','mutasi','keluar') NOT NULL DEFAULT 'aktif'");
        DB::statement("ALTER TABLE students MODIFY nis VARCHAR(50) NOT NULL");
        DB::statement("ALTER TABLE students MODIFY nik VARCHAR(30) NULL");
        DB::statement("ALTER TABLE students MODIFY address TEXT NULL");
        DB::statement("ALTER TABLE studies MODIFY description TEXT NULL");
    }
};
