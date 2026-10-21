<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\EducationType;
use App\Models\EducationalInstitution;
use App\Models\Education;
use App\Models\EducationClass;
use App\Models\Classroom;
use App\Models\AcademicYear;
use App\Models\Teacher;
use App\Models\Student;
use App\Models\Study;
use App\Models\LessonHour;
use App\Models\ClassGroup;
use App\Models\StudentClass;

class ImportFromSmptCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tarbiyah:import-from-smpt {--fresh : Bersihkan data sebelum mengimpor}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Impor data master dan akademik dari database smpt (pesantren) ke skema bersih tarbiyah (db_education)';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('=== MEMULAI IMPORT DATA DARI SMPT KE TARBIYAH ===');

        try {
            DB::connection('smpt')->getPdo();
            $this->info('Koneksi ke database smpt (pesantren) berhasil.');
        } catch (\Exception $e) {
            $this->error('Gagal terhubung ke database smpt: ' . $e->getMessage());
            return 1;
        }

        // 1. Import Tipe Pendidikan, Institusi, Jenjang & Ruang Kelas
        $this->importInstitutions();

        // 2. Import Data Guru dari Staf SMPT
        $this->importTeachers();

        // 3. Import Data Santri Mukim dari Siswa SMPT
        $this->importStudents();

        // 4. Import Data Kurikulum (Mapel & Jam KBM)
        $this->importCurriculum();

        // 5. Import Rombongan Belajar
        $this->importClassGroups();

        $this->info('=== IMPORT SELESAI DENGAN SUKSES! ===');
        return 0;
    }

    protected function importInstitutions(): void
    {
        $this->info('-> Mengimpor Institusi & Jenjang...');

        $types = DB::connection('smpt')->table('education_types')->orderBy('id')->get();
        foreach ($types as $t) {
            EducationType::updateOrCreate(['id' => $t->id], [
                'name'        => $t->name,
                'description' => $t->description ?? null,
            ]);
        }

        $insts = DB::connection('smpt')->table('educational_institutions')->orderBy('id')->get();
        foreach ($insts as $i) {
            EducationalInstitution::updateOrCreate(['id' => $i->id], [
                'education_type_id'   => $i->education_type_id ?? 1,
                'registration_number' => $i->registration_number ?? null,
                'name'                => $i->institution_name,
                'short_name'          => mb_substr($i->institution_name, 0, 30),
                'progression_type'    => 'semester',
                'address'             => $i->institution_address ?? null,
                'phone'               => $i->institution_phone ?? null,
                'email'               => $i->institution_email ?? null,
                'website'             => $i->institution_website ?? null,
                'logo'                => $i->institution_logo ?? null,
                'status'              => in_array($i->institution_status ?? 'active', ['active', 'inactive'])
                                            ? $i->institution_status : 'active',
                'description'         => $i->institution_description ?? null,
            ]);
        }

        $educations = DB::connection('smpt')->table('educations')->orderBy('id')->get();
        foreach ($educations as $e) {
            Education::updateOrCreate(['id' => $e->id], [
                'educational_institution_id' => $e->educational_institution_id ?? EducationalInstitution::first()?->id ?? 1,
                'name'                       => $e->name,
                'level'                      => 1,
                'description'                => $e->description ?? null,
            ]);
        }

        $classes = DB::connection('smpt')->table('education_classes')->orderBy('id')->get();
        foreach ($classes as $c) {
            EducationClass::updateOrCreate(['id' => $c->id], [
                'code' => $c->code ?? $c->name,
                'name' => $c->name,
            ]);
        }

        $rooms = DB::connection('smpt')->table('classrooms')->orderBy('id')->get();
        foreach ($rooms as $r) {
            Classroom::updateOrCreate(['id' => $r->id], [
                'educational_institution_id' => $r->educational_institution_id ?? null,
                'name'                       => $r->name,
                'code'                       => 'R-' . $r->id,
                'capacity'                   => 30,
                'description'                => $r->description ?? null,
            ]);
        }

        $this->line('   Institusi, Jenjang, dan Ruang Kelas selesai.');
    }

    protected function importTeachers(): void
    {
        $this->info('-> Mengimpor Dewan Guru dari Staf SMPT...');

        $staffs = DB::connection('smpt')->table('staff')->orderBy('id')->get();
        $count = 0;
        foreach ($staffs as $s) {
            $fullName = trim(($s->first_name ?? '') . ' ' . ($s->last_name ?? ''));
            if ($fullName === '') {
                $fullName = 'Staf ' . $s->id;
            }

            Teacher::updateOrCreate(
                ['nip' => $s->nip ?? ('STAF-' . $s->id)],
                [
                    'name'           => $fullName,
                    'gender'         => in_array($s->gender ?? 'L', ['L', 'P']) ? $s->gender : 'L',
                    'phone'          => $s->phone ?? null,
                    'email'          => $s->email ?? null,
                    'specialization' => 'Pengajar Pesantren',
                    'status'         => 'tetap',
                    'is_active'      => true,
                ]
            );
            $count++;
        }
        $this->line("   {$count} guru diimpor.");
    }

    protected function importStudents(): void
    {
        $this->info('-> Mengimpor Santri Mukim dari Siswa SMPT...');

        $students = DB::connection('smpt')->table('students')->orderBy('id')->get();
        $count = 0;
        foreach ($students as $s) {
            $fullName = trim(($s->first_name ?? '') . ' ' . ($s->last_name ?? ''));
            if ($fullName === '') {
                $fullName = 'Santri ' . $s->nis;
            }

            // Pemetaan status enum smpt -> tarbiyah
            $statusMap = [
                'aktif'        => 'aktif',
                'lulus'        => 'lulus',
                'mutasi'       => 'mutasi',
                'keluar'       => 'keluar',
                'tugas'        => 'aktif',
                'dikeluarkan'  => 'keluar',
                'tidak aktif'  => 'keluar',
            ];
            $rawStatus = strtolower($s->status ?? 'aktif');
            $status = $statusMap[$rawStatus] ?? 'aktif';

            Student::updateOrCreate(
                ['nis' => $s->nis],
                [
                    'santri_id'    => $s->id,
                    'name'         => $fullName,
                    'nik'          => $s->nik ?? null,
                    'gender'       => in_array($s->gender ?? 'L', ['L', 'P']) ? $s->gender : 'L',
                    'is_mukim'     => true, // Dari SMPT selalu Santri Mukim Pesantren
                    'born_in'      => $s->born_in ?? null,
                    'born_at'      => $s->born_at ?? null,
                    'parent_name'  => null,
                    'parent_phone' => $s->phone ?? null,
                    'address'      => $s->address ?? null,
                    'photo'        => $s->photo ?? null,
                    'status'       => $status,
                ]
            );
            $count++;
        }
        $this->line("   {$count} santri mukim diimpor ke tarbiyah.");
    }

    protected function importCurriculum(): void
    {
        $this->info('-> Mengimpor Mata Pelajaran & Jam KBM...');

        $studies = DB::connection('smpt')->table('studies')->orderBy('id')->get();
        foreach ($studies as $st) {
            Study::updateOrCreate(['name' => $st->name], [
                'code'        => 'MP-' . $st->id,
                'kkm'         => 75.00,
                'description' => $st->description ?? null,
                'is_active'   => true,
            ]);
        }

        $hours = DB::connection('smpt')->table('lesson_hours')->orderBy('order')->get();
        foreach ($hours as $h) {
            LessonHour::updateOrCreate(['name' => $h->name], [
                'start_time'  => $h->start_time,
                'end_time'    => $h->end_time,
                'order'       => $h->order ?? 1,
                'is_break'    => false,
                'description' => $h->description ?? null,
                'is_active'   => true,
            ]);
        }
        $this->line('   Mapel dan Jam KBM selesai.');
    }

    protected function importClassGroups(): void
    {
        $this->info('-> Mengimpor Rombongan Belajar (Class Groups)...');

        $defaultYear = AcademicYear::where('active', true)->first();
        $defaultInst = EducationalInstitution::first();

        $groups = DB::connection('smpt')->table('class_groups')->orderBy('id')->get();
        $count = 0;
        foreach ($groups as $g) {
            ClassGroup::updateOrCreate(
                ['name' => $g->name],
                [
                    'academic_year_id'           => $defaultYear?->id ?? 1,
                    'educational_institution_id' => $g->educational_institution_id ?? $defaultInst?->id ?? 1,
                    'classroom_id'               => $g->classroom_id ?? null,
                    'code'                       => 'RMB-' . $g->id,
                    'gender'                     => 'campur',
                    'progression_type'           => 'semester',
                    'capacity'                   => 35,
                    'is_active'                  => true,
                ]
            );
            $count++;
        }
        $this->line("   {$count} rombongan belajar selesai.");
    }
}
