<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Mengorkestrasi pemanggilan seeder-seeder modular yang telah dipisahkan per modul:
     * 1. UserSeeder        : Akun sistem (admin, guru, musyrif)
     * 2. TeacherSeeder     : Data dewan guru (tetap, honorer, guru luar mandiri)
     * 3. InstitutionSeeder : Lembaga pendidikan formal & tahfidz, jenjang, dan ruang kelas
     * 4. AcademicYearSeeder: Tahun ajaran & semester
     * 5. StudySeeder       : Mata pelajaran kurikulum formal & materi tahfidz
     * 6. LessonHourSeeder  : Jam pelajaran KBM harian & istirahat
     * 7. ClassGroupSeeder  : Rombel kelas formal semesteran & halaqah tahfidz leveling
     * 8. StudentSeeder     : Santri mukim (~90%) & siswa reguler luar (~10%)
     * 9. KbmSeeder         : Jadwal pelajaran mingguan, jurnal mengajar, & presensi
     * 10. AssessmentSeeder : Asesmen, bobot nilai, dan lembar skor santri
     */
    public function run(): void
    {
        $this->call([
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
