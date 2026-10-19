# AGENTS.md — Workspace Rules (tarbiyah / education-be)

## Tech Stack Backend Pendidikan (tarbiyah)
- Laravel 13, PHP 8.4
- Auth: JWT (`tymon/jwt-auth`)
- RBAC: `spatie/laravel-permission`
- Activity Log: `spatie/laravel-activitylog`
- Export/Import: `maatwebsite/excel` & `barryvdh/laravel-dompdf`
- API Documentation: `dedoc/scramble` (URL: `/docs/api`)
- Database: MySQL (semua environment)
  - Dev: `DB_DATABASE=db_education`, Host `127.0.0.1:3306`, Port `8002`

## Konsep Layanan Pendidikan (Tarbiyah)
1. **Lembaga & Kalender**: `EducationalInstitution`, `EducationType`, `Education`, `EducationClass`, `AcademicYear`, `AcademicQuarter`, `Classroom`
2. **Kurikulum & Mapel**: `Study` (Mata Pelajaran), `StaffStudy`, `LessonHour`, `LessonSession`
3. **Rombongan Belajar (Rombel)**: `ClassGroup`, `StudentClass` (Penempatan Santri)
4. **Jadwal & KBM**: `ClassSchedule`, `ClassScheduleDetail`, `MeetingSchedule`
5. **Presensi Belajar**: `Presence` (Kehadiran Santri per Pertemuan KBM)
6. **Asesmen & Nilai**: `StudentAssessment`, `AssessmentScore`, `AssessmentFormula`
7. **Evaluasi & Rapor**: `ReportCard`, Kenaikan Kelas

## Rules Pengembangan
1. Semua route API ada di `routes/api.php`
2. Prefix route:
   - `/api/auth/*` (Login, refresh, profile)
   - `/api/master/*` (Data master akademik & kurikulum, middleware: `autoprovision`, `auth:api`)
   - `/api/main/*` (Proses KBM, presensi, asesmen, rapor, middleware: `autoprovision`, `auth:api`)
   - `/api/internal/*` (Service-to-service, middleware: `internal.key` dengan header `X-Internal-Key`)
3. Auth & Auto-Provision:
   - Shared JWT secret dengan `smpt` dan `bank-santri`
   - Middleware `autoprovision` memastikan akun user tersinkronisasi otomatis saat request membawa Bearer Token yang valid.
4. Soft delete pattern: `trashed`, `restore`, `forceDelete`
5. Form Request untuk validasi (`app/Http/Requests/`) & API Resource untuk respons (`app/Http/Resources/`)
