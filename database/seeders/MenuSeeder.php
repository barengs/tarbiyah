<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;

/**
 * Seeder menu aplikasi Tarbiyah.
 * Idempotent: updateOrCreate berbasis `slug` (stabil), aman re-run.
 * Data menu & urutan mengikuti struktur sidebar saat ini.
 */
class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedTop('dashboard', 'Dashboard Utama', '/', 'LayoutDashboard', 1, 'dashboard');
        $this->seedGroup('kurikulum', 'Jenjang & Kurikulum', 'Building2', 2);
        $this->seedGroup('kelas-rombel', 'Kelas & Rombel', 'Layers', 3);
        $this->seedGroup('santri', 'Santri & Kenaikan Kelas', 'Users', 4);
        $this->seedTop('kbm', 'Jadwal Pelajaran & Halaqah', '/kbm', 'Clock', 5, 'kbm');
        $this->seedTop('presensi', 'Presensi & Disiplin', '/presensi', 'ClipboardCheck', 6, 'presensi');
        $this->seedTop('rapor', 'Rekap Tahfizh & Nilai', '/rapor', 'ScrollText', 7, 'rapor');
        $this->seedGroup('pengaturan', 'Pengaturan', 'Settings', 8);

        // --- Jenjang & Kurikulum ---
        $this->seedChild('kurikulum', 'jenjang', 'Jenjang Pendidikan', '/kurikulum/jenjang', 'Building2', 1, 'jenjang');
        $this->seedChild('kurikulum', 'tahun-akademik', 'Tahun & Periode Triwulan', '/kurikulum/tahun-akademik', 'Calendar', 2, 'tahun_akademik');
        $this->seedChild('kurikulum', 'mapel', 'Mata Pelajaran', '/kurikulum/mapel', 'BookOpen', 3, 'mapel');
        $this->seedChild('kurikulum', 'jam-pelajaran', 'Jam Pelajaran', '/kurikulum/jam-pelajaran', 'Clock', 4, 'jam_pelajaran');
        $this->seedChild('kurikulum', 'guru', 'Guru & Pendidik', '/guru', 'GraduationCap', 5, 'guru');

        // --- Kelas & Rombel ---
        $this->seedChild('kelas-rombel', 'kelas', 'Tingkat Kelas', '/kurikulum/kelas', 'Layers', 1, 'kelas');
        $this->seedChild('kelas-rombel', 'rombel', 'Rombongan Belajar (Rombel)', '/kurikulum/rombel', 'Users', 2, 'rombel');

        // --- Santri & Kenaikan Kelas ---
        $this->seedChild('santri', 'siswa', 'Data Santri / Siswa', '/siswa', 'UserCheck', 1, 'siswa');
        $this->seedChild('santri', 'kenaikan-kelas', 'Kenaikan Kelas & Mutasi', '/kurikulum/kenaikan-kelas', 'TrendingUp', 2, 'kenaikan_kelas');

        // --- Pengaturan (admin) ---
        $this->seedChild('pengaturan', 'user', 'Manajemen Pengguna', '/admin/pengguna', 'UserCog', 1, 'user');
        $this->seedChild('pengaturan', 'menu', 'Manajemen Menu', '/admin/menu', 'LayoutGrid', 2, 'menu');
        $this->seedChild('pengaturan', 'role', 'Role & Hak Akses', '/admin/role', 'ShieldCheck', 3, 'role');
    }

    private function seedTop(string $slug, string $name, ?string $path, string $icon, int $order, ?string $perm): void
    {
        Menu::updateOrCreate(
            ['slug' => $slug],
            [
                'parent_id'       => null,
                'name'            => $name,
                'icon'          => $icon,
                'path'          => $path,
                'permission_slug' => $perm,
                'sort_order'      => $order,
                'is_active'       => true,
            ]
        );
    }

    private function seedGroup(string $slug, string $name, string $icon, int $order): void
    {
        Menu::updateOrCreate(
            ['slug' => $slug],
            [
                'parent_id'       => null,
                'name'            => $name,
                'icon'            => $icon,
                'permission_slug' => null,
                'sort_order'      => $order,
                'is_active'       => true,
            ]
        );
    }

    private function seedChild(string $parentSlug, string $slug, string $name, string $path, string $icon, int $order, string $perm): void
    {
        $parent = Menu::where('slug', $parentSlug)->first();
        Menu::updateOrCreate(
            ['slug' => $slug],
            [
                'parent_id'       => $parent?->id,
                'name'            => $name,
                'icon'          => $icon,
                'path'          => $path,
                'permission_slug' => $perm,
                'sort_order'      => $order,
                'is_active'       => true,
            ]
        );
    }
}
