# TASK LIST — TRACKER PENGEMBANGAN TARBIYAH

Task list ini digunakan untuk memantau pengerjaan fitur secara detail dan bertahap.

## 🟢 FASE 0: Inisialisasi & Fondasi (SELESAI)
- [x] **Setup Framework**: Laravel 13, PHP 8.4, Port 8002, MySQL `db_education`
- [x] **Setup Backend Packages**: JWT Auth, Spatie Permission v8, Activitylog v5, DomPDF, Excel, Scramble
- [x] **Setup Frontend SPA**: React 19, React Router v7, Redux Toolkit, Tailwind CSS v4, Lucide React di `resources/js/`
- [x] **Setup SSO Handover & Web Route**: Integrasi login langsung + token handover dari pesantren di `resources/views/app.blade.php`
- [x] **Verifikasi Build**: `npm run build` sukses (1.7s)

---

## 🟢 FASE 1: Master Data Lembaga, Jenjang, & Pengguna (SELESAI)
- [x] **Task 1.1**: Migrasi skema database Master Lembaga (`educational_institutions`, `education_types`, `educations`, `education_classes`)
- [x] **Task 1.2**: Migrasi skema database Kalender Akademik (`academic_years`, `academic_quarters`, `classrooms`)
- [x] **Task 1.3**: Migrasi skema tabel Siswa (`students`) dengan atribut `is_mukim` (90% santri, 10% murid reguler)
- [x] **Task 1.4**: Model Eloquent & Relasi untuk Lembaga, Jenjang, dan Siswa
- [x] **Task 1.5**: Controller API Master Lembaga & Jenjang (CRUD + Form Request Validation)
- [x] **Task 1.6**: Endpoint Sinkronisasi Santri Mukim (`POST /api/internal/students/sync`) dari `smpt`
- [x] **Task 1.7**: Antarmuka React: Halaman Manajemen Lembaga & Jenjang (`/master/institusi`)
- [x] **Task 1.8**: Antarmuka React: Halaman Pendaftaran & Daftar Siswa (`/siswa`)

---

## 🟢 FASE 2: Kurikulum, Mapel, & Rombel (Dual-Model Kenaikan) (SELESAI)
- [x] **Task 2.1**: Migrasi Mata Pelajaran (`studies`), Jam Pelajaran (`lesson_hours`)
- [x] **Task 2.2**: Migrasi Rombongan Belajar (`class_groups`) & Penempatan Siswa (`student_classes`)
- [x] **Task 2.3**: Implementasi Logika Rombel Formal (Model Semesteran)
- [x] **Task 2.4**: Implementasi Modul Khusus Tahfidz / Halaqah (Model Leveling Mingguan & Target Juz)
- [x] **Task 2.5**: Controller API Kurikulum, Mapel, dan Rombel
- [x] **Task 2.6**: Antarmuka React: Halaman Kurikulum & Mapel (`/master/mapel`)
- [x] **Task 2.7**: Antarmuka React: Halaman Rombel & Tahfidz Leveling (`/rombel` & `/tahfidz`)

---

## 🟢 FASE 3: Jadwal Pelajaran & Presensi KBM (SELESAI)
- [x] **Task 3.1**: Migrasi Jurnal Pertemuan (`teaching_journals`) & Presensi Siswa (`student_presences`)
- [x] **Task 3.2**: Model Eloquent `TeachingJournal` & `StudentPresence` dengan logika auto-populate presensi
- [x] **Task 3.3**: Controller API Jurnal KBM (`/api/main/journals`) — termasuk batch update presensi & rekap kehadiran
- [x] **Task 3.4**: Antarmuka React: Kalender / Jadwal Pelajaran Mingguan (`/kbm` — matriks 7 hari)
- [x] **Task 3.5**: Antarmuka React: Jurnal Mengajar & Form Presensi KBM (tombol Hadir/Izin/Sakit/Alpa per siswa)
- [x] **Task 3.6**: Antarmuka React: Rekapitulasi Kehadiran per Rombel (persentase per santri)

---

## 🟢 FASE 4: Penilaian, Asesmen Dinamis, & Cetak Rapor (SELESAI)
- [x] **Task 4.1**: Migrasi Rumus Penilaian (`assessment_categories`) & Komponen Nilai (Tugas Harian, UTS, UAS, Praktik, Tahfidz)
- [x] **Task 4.2**: Migrasi Asesmen Siswa (`assessments`, `assessment_scores`)
- [x] **Task 4.3**: Migrasi Buku Rapor (`report_cards`) & Logika Kalkulasi Nilai Akhir & Ranking
- [x] **Task 4.4**: Template Cetak Rapor PDF Resmi menggunakan `barryvdh/laravel-dompdf` (`resources/views/pdf/report_card.blade.php`)
- [x] **Task 4.5**: Antarmuka React: Lembar Input Nilai Guru Mapel & Leger Nilai Kelas (`/nilai` — `AssessmentPage.jsx`)
- [x] **Task 4.6**: Antarmuka React: Kalkulasi & Cetak Buku Rapor Digital (`/rapor` — `ReportCardPage.jsx`)

---

## 🟡 FASE 5: Pengujian, Integrasi Ekosistem, & Cutover (NEXT UP)
- [ ] **Task 5.1**: Integrasi Pengecekan Tunggakan Ujian ke `bank-santri` via Internal API (`X-Internal-Key`)
- [ ] **Task 5.2**: Webhook / Sinkronisasi Santri Otomatis dari `smpt` ke `tarbiyah` saat ada mutasi/pendaftaran santri
- [ ] **Task 5.3**: Database Seeder & Data Demo Awal (Lembaga, Jenjang, Guru, Siswa, Mapel, Rombel)
- [ ] **Task 5.4**: Pengujian Integrasi Alur Penuh (End-to-End) & Verifikasi Dokumentasi API
