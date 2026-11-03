# Dokumen Hasil Analisa Rencana & Fitur Tertunda (Gap Analysis)
## Sistem Manajemen Pendidikan Pesantren — Proyek Tarbiyah (Port 8002)

**Tanggal Analisa:** 3 November 2026  
**Status Repositori:**
- `tarbiyah`: Branch `main` (Port 8002)
- `smpt`: Branch `varsi-2` (Port 8000)
- `smp-fe`: Branch `varsi-2` (Port 5173)
- `bank-santri`: Branch `main` (Port 8001)

---

## 1. Latar Belakang & Ruang Lingkup

Setelah berhasil memisahkan modul manajemen pendidikan dari sistem kepesantrenan utama (`smpt` & `smp-fe`) ke sistem mandiri **Tarbiyah**, telah dilakukan audit komprehensif antara dokumen perencanaan awal dengan implementasi riil pada codebase.

Dokumen acuan yang dianalisis:
1. `TASK_LIST.md` (Tracker pengembangan bertahap)
2. `docs/DEVELOPMENT_PLAN_TARBIYAH.md` (Spesifikasi arsitektur & rencana integrasi)
3. `docs/DEVELOPMENT_PLAN_MENU_ROLE_MANAGEMENT.md` (Spesifikasi RBAC & menu dinamis)

---

## 2. Matriks Evaluasi Realisasi Fitur (Status Terkini)

| Modul / Fase | Target Rencana | Realisasi di Codebase | Status |
|---|---|---|:---:|
| **Fase 0: Fondasi & Setup** | Laravel 13, React 19, Tailwind v4, JWT Auth, SSO Handover | Berjalan stabil di port 8002, build frontend 1.7s | ✅ **100% Selesai** |
| **Fase 1: Master Lembaga & Siswa** | Institusi, Jenjang, Tingkat Kelas, Ruang Kelas, Siswa, Guru | CRUD lengkap, Import/Export Excel Mapel & Institusi | ✅ **100% Selesai** |
| **Fase 2: Kurikulum & Rombel** | Mapel, Jam Pelajaran, Rombel Formal & Leveling Tahfidz | Dual-model berjalan (semester vs leveling mingguan) | ✅ **100% Selesai** |
| **Fase 3: KBM & Presensi** | Jadwal Pelajaran Mingguan, Jurnal Mengajar, Presensi Guru & Siswa | Matriks 7 hari, salin jadwal, presensi siswa lengkap | ✅ **100% Selesai** |
| **Fase 4: Penilaian & Rapor** | Bobot nilai dinamis, Penilaian Triwulan, Rapor Siswa PDF | Kalkulasi nilai, ranking, template PDF resmi aktif | ✅ **100% Selesai** |
| **RBAC & Menu Dinamis** | Menu berbasis DB, Matriks Permission Role, Manajemen Pengguna | Menu & Role CRUD, tree menu, assign role aktif | ✅ **100% Selesai** |
| **BFF Education History** | Tampilkan riwayat pendidikan santri di detail santri SMPT | Endpoint internal + service proxy + tab UI santri | ✅ **100% Selesai** |
| **Pembersihan Modul SMPT** | Hapus controller & route akademik lama di `smpt` & `smp-fe` | Selesai di branch `varsi-2`, menunggu merge/cutover | 🟡 **Tersimpan di Branch** |

---

## 3. Rincian Rencana yang Belum Terealisasi / Masih Tertunda

Berikut adalah 7 poin rencana yang belum terealisasi atau belum tuntas secara operasional:

### 1. Penegakan Permission Middleware pada Endpoint Backend (Task B5)
* **Rencana Semula (`DEVELOPMENT_PLAN_MENU_ROLE_MANAGEMENT.md`):**  
  Seluruh route API master dan operasional dilindungi oleh middleware Spatie `permission:{menu_slug}.{action}`.
* **Kondisi Riil di `routes/api.php`:**  
  Semua route group `/api/master/*` dan `/api/main/*` saat ini baru diproteksi oleh:
  ```php
  Route::prefix('master')->middleware(['autoprovision', 'auth:api'])->group(...)
  Route::prefix('main')->middleware(['autoprovision', 'auth:api'])->group(...)
  ```
* **Masalah / Dampak:**  
  Proteksi hak akses baru terjadi di sisi visual frontend (sidebar dinamis & pembatasan routing React). Jika ada staf atau guru yang memiliki token JWT valid mengirim request langsung (via Postman, cURL, atau developer tools) ke endpoint modifikasi data (seperti `DELETE /api/master/institutions/1` atau ubah nilai siswa), backend tetap memprosesnya karena tidak ada verifikasi permission di level controller/route.
* **Solusi yang Perlu Dilakukan:**  
  Pasang middleware permission Spatie pada rute-rute sensitif (CUD: create, update, delete) atau buat controller base policy yang mengecek `$user->can(...)`.

---

### 2. Fitur Cetak Kartu Peserta Ujian PDF (Ekstensi Task 5.1 & T5.2)
* **Rencana Semula (`DEVELOPMENT_PLAN_TARBIYAH.md`):**  
  Integrasi kelayakan ujian santri dengan `bank-santri` digunakan saat panitia menerbitkan/mencetak Kartu Peserta Ujian santri.
* **Kondisi Riil:**  
  - Logika pengecekan tunggakan santri ke `bank-santri` sudah berfungsi di `BankSantriService.php` dan modal kelayakan di antarmuka rapor (`ReportCardPage.jsx`).
  - Namun template dan fitur **Cetak Kartu Ujian (PDF)** resmi (berisi identitas peserta, pas foto, jadwal ujian, ruang kelas, barcode/QR verifikasi, dan status lunas/dispensasi administrasi) **belum dibuat** di `resources/views/pdf/`.
* **Solusi yang Perlu Dilakukan:**  
  Buat template Blade `resources/views/pdf/exam_card.blade.php` dan endpoint `GET /api/main/assessments/exam-cards/{class_group_id}/pdf` untuk cetak kartu ujian massal per rombel.

---

### 3. Sinkronisasi Mutasi Status Santri Non-Aktif dari SMPT (Task 5.2)
* **Rencana Semula (`TASK_LIST.md`):**  
  Webhook / sinkronisasi santri otomatis saat terjadi mutasi atau pendaftaran santri baru di `smpt`.
* **Kondisi Riil:**  
  - Di `smpt` (`StudentController.php`), fungsi `TarbiyahSyncService::syncStudent()` hanya dipanggil dengan kondisi:
    ```php
    if (($updateData['status'] ?? null) === 'Aktif') {
        \App\Services\TarbiyahSyncService::syncStudent($student->fresh());
    }
    ```
  - Backend Tarbiyah (`InternalStudentController.php`) sebenarnya sudah siap menerima status `lulus`, `mutasi`, `keluar`.
* **Masalah / Dampak:**  
  Saat santri dinyatakan *Lulus*, *Keluar*, atau *Drop Out* di SMPT, sistem tidak mengirimkan sinyal ke Tarbiyah. Santri tersebut akan tetap berstatus `aktif` di rombel kelas Tarbiyah dan masuk ke jurnal presensi maupun lembar penilaian.
* **Solusi yang Perlu Dilakukan:**  
  Hapus syarat `=== 'Aktif'` pada sinkronisasi di `smpt`, sehingga setiap perubahan status santri langsung tersinkron ke Tarbiyah, dan tambahkan logika auto-deaktivasi penempatan rombel jika status santri berubah menjadi non-aktif.

---

### 4. Standarisasi & Kebijakan Sinkronisasi Tahun Akademik (`academic_years`)
* **Pertanyaan Sebelumnya:**  
  Apakah Tarbiyah akan menarik master Tahun Akademik dari SMPT secara otomatis, atau masing-masing aplikasi mengelola tahun akademiknya sendiri?
* **Analisa Perbedaan:**
  - **SMPT**: Menggunakan `academic_years` sederhana (nama, tahun mulai, tahun selesai, status aktif) untuk administrasi pesantren dan keuangan SPP santri.
  - **Tarbiyah**: Menggunakan hirarki bertingkat: `academic_years` membawahi periode sub-akademik `academic_quarters` (Triwulan 1 s.d. 4) dengan pengaturan tanggal aktif, masa input nilai (`grading_period`), dan kunci nilai (`is_locked`).
* **Pilihan Keputusan:**
  - **Opsi A (Tarbiyah Tarik Data dari SMPT):** Master tahun akademik utama disinkronkan otomatis dari SMPT via API internal, namun pembuatan triwulan (`academic_quarters`) tetap dilakukan oleh bagian kurikulum di Tarbiyah.
  - **Opsi B (Independen / Berdiri Sendiri):** Tarbiyah mengelola tahun ajaran dan kalender akademik secara mandiri karena kalender pendidikan sekolah/madrasah seringkali memiliki tanggal efektif yang berbeda dengan kalender kepesantrenan.

---

### 5. Otomasi Sinkronisasi Master Program (Scheduler / Cron)
* **Kondisi Riil:**  
  - Endpoint `POST /api/master/programs/sync-from-smpt` sudah berfungsi menarik data program dari SMPT.
  - Namun proses ini masih manual (harus diklik oleh admin di UI).
* **Solusi yang Perlu Dilakukan:**  
  Tambahkan task scheduler di `routes/console.php` untuk menjalankan sinkronisasi program setiap hari (misal pukul 02:00 malam) atau saat aplikasi start up.

---

### 6. Pengujian Otomatis (E2E) & Load Testing Produksi (Task 5.4)
* **Kondisi Riil:**  
  - Pengujian baru mencakup unit test dasar framework (2 test bawaan PHPUnit).
  - Belum ada automated test untuk skenario:
    1. Input presensi KBM serentak oleh dewan guru.
    2. Input nilai massal dan kalkulasi rapor.
    3. Ekspor PDF buku rapor untuk ratusan santri secara bersamaan (uji batas memori PHP & DomPDF).
* **Solusi yang Perlu Dilakukan:**  
  Tambahkan Pest/PHPUnit Feature Tests untuk modul penilaian & KBM, serta optimasi caching/chunking jika mencetak PDF dalam jumlah besar.

---

### 7. Cutover & Penggabungan Branch `varsi-2` di SMPT & SMP-FE
* **Kondisi Riil:**  
  - Pembersihan controller, model, dan halaman pendidikan lama di `smpt` dan `smp-fe` telah berhasil dan tersimpan rapi di branch `varsi-2`.
  - Belum dilakukan merge ke branch utama (`main`/`master`) dan belum dilakukan deploy ke server staging.
* **Langkah Lanjutan:**  
  Setelah Tarbiyah dipastikan siap 100%, branch `varsi-2` dapat di-merge secara resmi untuk finalisasi cutover.

---

## 4. Matriks Rekomendasi Prioritas & Estimasi Pengerjaan

| No | Rencana Tertunda | Prioritas | Kompleksitas | Dampak Utama |
|:---:|---|:---:|:---:|---|
| **1** | **Backend Permission Enforcement** di API | **P1 (Tinggi)** | Ringan - Sedang | Mencegah bypass otorisasi direct API |
| **2** | **Sync Mutasi Status Non-Aktif** dari SMPT | **P1 (Tinggi)** | Ringan | Mencegah santri lulus/keluar tetap aktif di kelas |
| **3** | **Cetak Kartu Peserta Ujian (PDF)** | **P2 (Sedang)** | Sedang | Memudahkan panitia ujian mencetak kartu resmi berstatus lunas |
| **4** | **Keputusan & Sinkronisasi Tahun Akademik** | **P2 (Sedang)** | Ringan | Menyelaraskan kalender ajaran antar sistem |
| **5** | **Cron Scheduler Sinkronisasi Program** | **P3 (Rendah)** | Sangat Ringan | Otomasi pemeliharaan data background |
| **6** | **Automated Tests & Load Testing PDF** | **P3 (Rendah)** | Sedang | Kestabilan server saat cetak rapor semesteran |
| **7** | **Merge Branch varsi-2 (Cutover Final)** | **P4 (Tahap Akhir)** | Ringan | Perilisan resmi versi bersih ke production |

---

## 5. Lembar Keputusan & Arahan Pengguna (Disetujui 3 Nov 2026)

Berdasarkan komentar dan arahan pengguna:

1. **Keamanan Permission Backend (Poin 1):**  
   - ✅ **Disetujui:** Buatkan penegakan middleware `permission:{menu_slug}.{action}` pada route modifikasi data backend (CUD) agar hak akses di backend sinkron dengan matriks role Spatie.

2. **Cetak Kartu Peserta Ujian PDF (Poin 2):**  
   - ✅ **Disetujui:** Tambahkan fitur dan template Cetak Kartu Peserta Ujian PDF (terhubung dengan verifikasi kelayakan tunggakan Bank Santri).

3. **Mekanisme Data Santri Baru & Mutasi (Poin 3):**  
   - ✅ **Disetujui:** Gunakan mekanisme **Kirim (Push)** atau **Tarik (Pull)**:
     - **Alur Kirim (Push):** Saat santri di SMPT sudah melengkapi semua administrasi pembayaran pendaftaran dan berstatus `Aktif`, SMPT otomatis mengirimkan data santri ke Tarbiyah sebagai siswa baru. Begitu juga saat ada perubahan status non-aktif (`Lulus`, `Keluar`, `DO`), update status dikirim agar dinonaktifkan di Tarbiyah.
     - **Alur Tarik (Pull):** Di Tarbiyah, admin dapat menarik daftar santri baru dari SMPT yang telah memenuhi syarat (status `Aktif` dan administrasi lengkap).

4. **Tahun Akademik & Sub-Akademik Triwulan (Poin 4):**  
   - ✅ **Disetujui:** Tarbiyah **menarik master Tahun Akademik dari SMPT**, lalu dihubungkan dengan sub-akademik di Tarbiyah.
   - ✅ **Ketentuan Khusus:** Periode sub-akademik triwulan dibatasi **maksimal 3 tingkat saja** (Triwulan I, II, dan III), bukan 4 tingkat.

5. **Otomasi Master Program (Poin 5):**  
   - ✅ **Disetujui:** Tetap menggunakan mekanisme **Tarik Data (Pull On-Demand)** saat dibutuhkan saja; tidak memerlukan background cron scheduler.

---

## 6. Rencana Kerja Eksekusi (Action Plan)

1. **Langkah 1: Tahun Akademik & Triwulan (3 Tingkat + Tarik dari SMPT)**
   - Buat internal endpoint `GET /api/internal/academic-years` di `smpt`.
   - Buat fungsi penarikan `POST /api/master/academic-years/sync-from-smpt` di `tarbiyah`.
   - Ubah logika auto-generate triwulan di `AcademicYearController` dan `AcademicYearSeeder` menjadi **3 tingkat** (Triwulan I, II, III).
   - Tambahkan tombol "Tarik dari SMPT" di halaman UI `AcademicYearPage.jsx`.

2. **Langkah 2: Penyempurnaan Alur Kirim & Tarik Siswa Baru / Mutasi**
   - Di `smpt`: Pastikan pemicu `TarbiyahSyncService::syncStudent()` berjalan saat administrasi santri tuntas (`Aktif`), serta saat ada mutasi santri non-aktif (`Lulus`/`Keluar`).
   - Di `tarbiyah`: Perkuat validasi di `pullFromSmpt` dan de-aktivasi penempatan kelas santri jika status non-aktif diterima.

3. **Langkah 3: Cetak Kartu Peserta Ujian (PDF)**
   - Buat view Blade `resources/views/pdf/exam_card.blade.php`.
   - Buat endpoint `GET /api/main/assessments/exam-cards/{class_group_id}/pdf` di `AssessmentController`.
   - Tambahkan tombol "Cetak Kartu Ujian (PDF)" di antarmuka penilaian/rapor Tarbiyah.

4. **Langkah 4: Penegakan Middleware Permission di Backend API**
   - Terapkan middleware `permission:` pada rute-rute CUD di [routes/api.php](file:///Users/rofi/Development/pesantren/tarbiyah/routes/api.php).
   - Verifikasi pengujian akses per role (admin, staf, asatidz, walikelas).


