# Development Plan & Task List: Proyek Tarbiyah

Dokumen ini adalah panduan kerja teknis (development plan) dan *task list* untuk pengembangan sistem Manajemen Pendidikan (**Tarbiyah / Port 8002**) secara terukur dan termonitor.

## 1. Definisi Ruang Lingkup & Arsitektur

### 1.1 Tech Stack
| Kategori | Komponen |
|---|---|
| Backend | Laravel 13, PHP 8.4, MySQL 8 (`db_education`) |
| Authentication | Shared JWT (`tymon/jwt-auth`) + Auto-Session SSO Handover |
| RBAC | Spatie Laravel Permission v8 |
| Frontend | React 19 SPA & Tailwind CSS v4 di dalam `resources/js/` |
| Package Manager | Composer, NPM |
| Port Lokal | `8002` |

### 1.2 Arsitektur Pemisahan
1. `tarbiyah` adalah **Sistem Pendidikan Mandiri & Terisolasi**.
2. Mengakomodasi:
   - **Guru Luar:** Dapat login langsung tanpa akses ke sistem kepesantrenan.
   - **Siswa:** 90% Santri Mukim (sinkronisasi dari `smpt`), 10% Siswa Non-Santri (pendaftaran lokal).
   - **Jenjang:** Formal (SMP/SMA/MTs/MA - Semesteran) & Tahfidz (Leveling Berjenjang Mingguan).

---

## 2. Task List: Fase 1 - Fondasi & Data Master Akademik

Fokus: Membangun kerangka data akademik dan entitas Pengguna/Guru.

| ID | Task | Status | Output / Definition of Done |
|---|---|---|---|
| **T1.1** | Inisialisasi proyek & dependensi | `[x] Selesai` | `composer install` dan `npm install` tarbiyah berjalan |
| **T1.2** | Setup React SPA `resources/js/` | `[x] Selesai` | `npm run build` sukses, Vite & Tailwind v4 berfungsi |
| **T1.3** | SSO Handover & Auth API | `[x] Selesai` | Rute `POST /api/auth/login`, middleware `internal.key` & `autoprovision` |
| **T1.4** | **Migrasi Entitas Lembaga, Jenjang & Tahun Ajaran** | `[ ] Belum` | Tabel `institutions`, `education_types`, `academic_years` & `academic_quarters` ter-migrate |
| **T1.5** | **Migrasi Entitas Guru (Teachers) & Pengguna** | `[ ] Belum` | Tabel `teachers` (mendukung Guru Internal via `staff_id` & Guru Luar) ter-migrate |
| **T1.6** | **Migrasi Entitas Siswa (Students) & Sinkronisasi Santri** | `[ ] Belum` | Tabel `students` ter-migrate, endpoint `POST /api/internal/students/sync` dari `smpt` |
| **T1.7** | **Endpoint API Master & Form UI (Lembaga & Guru)** | `[ ] Belum` | CRUD Lembaga, Tambah/Ganti Guru di halaman `Institusi & Guru` |

---

## 3. Task List: Fase 2 - Struktur Pendidikan & Rombel

Fokus: Kelas, Rombongan Belajar (Rombel), Penempatan Guru, dan Mapel.

| ID | Task | Status | Output / Definition of Done |
|---|---|---|---|
| **T2.1** | **Model Leveling Tahfidz (Halaqah) & Formal Semesteran** | `[ ] Belum` | Tabel `class_groups` mendukung `progression_type` (`semester` vs `leveling`) |
| **T2.2** | **Master Data Mata Pelajaran (Mapel)** | `[ ] Belum` | Tabel `studies` (Mapel), `lesson_hours`, `lesson_sessions` ter-migrate |
| **T2.3** | **Rombongan Belajar (Rombel) & Ruang Kelas** | `[ ] Belum` | Endpoint pengelompokan siswa ke Rombel (`class_groups`) |
| **T2.4** | **Penugasan Guru ke Mapel & Rombel** | `[ ] Belum` | Endpoint assignment `TeacherClassGroup`, logika jadwal mengajar |
| **T2.5** | **UI Rombel, Mapel & Jadwal Pelajaran** | `[ ] Belum` | Form Tambah Rombel, Input Jadwal Pelajaran Mingguan di UI |

---

## 4. Task List: Fase 3 - Kehadiran & Proses KBM

Fokus: Sistem Absensi Kehadiran dan Presensi Belajar Harian.

| ID | Task | Status | Output / Definition of Done |
|---|---|---|---|
| **T3.1** | **Presensi KBM / Kehadiran Belajar** | `[ ] Belum` | Tabel `presences`, input kehadiran siswa per pertemuan oleh guru |
| **T3.2** | **Kehadiran & Izin Guru Mengajar** | `[ ] Belum` | Presensi guru masuk ke sekolah, pengalihan sesi jika guru absen |
| **T3.3** | **Dashboard Guru & Monitoring Kehadiran** | `[ ] Belum` | UI Rekap Nilai, Absensi, & Progres Halaqah/Hafalan Tahfidz siswa per guru |

---

## 5. Task List: Fase 4 - Penilaian & Rapor

Fokus: Input Nilai, Asesmen Dinamis, Kalkulasi Rapor, & Kenaikan Kelas.

| ID | Task | Status | Output / Definition of Done |
|---|---|---|---|
| **T4.1** | **Katalog Rute Penilaian (Kategori Nilai & Bobot)** | `[ ] Belum` | Tabel `assessment_formulas` (bobot Nilai Harian, UTS, UAS) |
| **T4.2** | **Input Nilai / Asesmen Siswa** | `[ ] Belum` | Form input nilai di UI oleh guru mapel |
| **T4.3** | **Kenaikan Kelas (Semesteran vs Leveling Tahfidz)** | `[ ] Belum` | Logika otomatis naik level mingguan untuk santri tahfidz yang mencapai milestone |
| **T4.4** | **Generasi Cetak Buku Rapor (PDF)** | `[ ] Belum` | Rapor otomatis ter-print ke format PDF profesional menggunakan `barryvdh/laravel-dompdf` |

---

## 6. Task List: Fase 5 - Integrasi & Sinkronisasi Ekosistem

Fokus: Synchronizing dengan layanan lain dan Cutover akhir.

| ID | Task | Status | Output / Definition of Done |
|---|---|---|---|
| **T5.1** | **Integrasi Santri dengan `smpt`** | `[ ] Belum` | Payload Webhook saat santri masuk/putus di `smpt` tersinkronisasi |
| **T5.2** | **Integrasi Ujian dengan `bank-santri`** | `[ ] Belum` | Endpoint `bank-santri` dicek saat panitia mengeluarkan kartu ujian (dispensasi tunggakan) |
| **T5.3** | **Pembersihan Kode & Isolasi `smpt`** | `[ ] Belum` | Model dan Controller akademik dihapus atau dinonaktifkan dari `smpt` |
| **T5.4** | **Testing, Load Testing & Deploy** | `[ ] Belum` | Uji beban presensi & cetak rapor ribuan santri berjalan lancar di server produksi |
