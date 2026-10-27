<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Mengorkestrasi pemanggilan seeder-seeder modular yang telah dipisahkan per modul:
     * 1. RoleSeeder          : Master roles (superadmin, admin, asatidz, staf, walikelas)
     * 2. MenuSeeder          : Struktur navigasi hierarkis sistem
     * 3. RolePermissionSeeder: Penugasan permissions & menu ke roles
     * 4. SuperAdminSeeder    : Akun superadmin sistem
     * 5. UserSeeder          : Akun pengguna (mudir, admin, guru, musyrif)
     * 6. TeacherSeeder       : Data dewan guru
     * 7. InstitutionSeeder   : Lembaga pendidikan formal & tahfidz, jenjang, dan ruang kelas
     * 8. AcademicYearSeeder  : Tahun ajaran & semester
     * 9. StudySeeder         : Mata pelajaran kurikulum formal & materi tahfidz
     * 10. LessonHourSeeder   : Jam pelajaran KBM harian & istirahat
     * 11. ClassGroupSeeder   : Rombel kelas formal semesteran & halaqah tahfidz leveling
     * 12. StudentSeeder      : Santri mukim (~90%) & siswa reguler luar (~10%)
     * 13. KbmSeeder          : Jadwal pelajaran mingguan, jurnal mengajar, & presensi
     * 14. AssessmentSeeder   : Asesmen, bobot nilai, dan lembar skor santri
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            MenuSeeder::class,
            RolePermissionSeeder::class,
            SuperAdminSeeder::class,
            UserSeeder::class,
            TeacherSeeder::class,
            InstitutionSeeder::class,
            AcademicYearSeeder::class,
            StudySeeder::class,
            LessonHourSeeder::class,
            ClassGroupSeeder::class,
            StudentSeeder::class,
            KbmSeeder::class,
            AssessmentSeeder::class,
        ]);
    }
}
