<?php

namespace Tests\Feature;

use App\Models\AcademicQuarter;
use App\Models\AcademicYear;
use App\Models\ClassGroup;
use App\Models\EducationalInstitution;
use App\Models\LessonHour;
use App\Models\LessonSchedule;
use App\Models\Program;
use App\Models\SchedulePeriod;
use App\Models\Study;
use App\Models\Teacher;
use App\Models\TeachingJournal;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SchedulePeriodValidityTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private AcademicYear $year;
    private AcademicQuarter $quarter;
    private ClassGroup $classGroup;
    private Study $study;
    private Teacher $teacher;
    private LessonHour $lessonHour;

    protected function setUp(): void
    {
        parent::setUp();

        Role::firstOrCreate(['name' => 'superadmin', 'guard_name' => 'api']);
        $this->admin = User::factory()->create(['role' => 'superadmin']);
        $this->admin->assignRole('superadmin');

        $program = Program::firstOrCreate(
            ['name' => 'Kubar'],
            ['code' => 'KBR', 'is_active' => true]
        );

        $institution = EducationalInstitution::firstOrCreate(
            ['name' => 'Madrasah Wustha'],
            [
                'program_id' => $program->id,
                'short_name' => 'Wustha',
                'status' => 'active',
            ]
        );

        $this->year = AcademicYear::create([
            'year' => '1447/1448',
            'type' => 'triwulan',
            'periode' => 'ganjil',
            'start_date' => '2026-07-01',
            'end_date' => '2027-06-30',
            'active' => true,
        ]);

        $this->quarter = AcademicQuarter::create([
            'academic_year_id' => $this->year->id,
            'name' => 'Triwulan I',
            'start_date' => '2026-07-01',
            'end_date' => '2026-12-31',
            'active' => true,
        ]);

        $this->classGroup = ClassGroup::create([
            'academic_year_id' => $this->year->id,
            'program_id' => $program->id,
            'educational_institution_id' => $institution->id,
            'code' => '1A',
            'name' => '1A Wustha',
            'is_active' => true,
        ]);

        $this->study = Study::create([
            'educational_institution_id' => $institution->id,
            'code' => 'FQH',
            'name' => 'Fiqih',
            'kkm' => 75,
            'is_active' => true,
        ]);

        $this->teacher = Teacher::create([
            'name' => 'Ust. Ahmad',
            'gender' => 'L',
            'is_active' => true,
        ]);

        $this->lessonHour = LessonHour::create([
            'program_id' => $program->id,
            'name' => 'Jam Ke-1',
            'start_time' => '07:00:00',
            'end_time' => '08:00:00',
            'order' => 1,
            'is_active' => true,
        ]);
    }

    public function test_created_schedule_period_is_draft_and_not_effective_until_activated(): void
    {
        $createPeriod = $this->actingAs($this->admin, 'api')
            ->postJson('/api/main/schedule-periods', [
                'name' => 'Jadwal Periode 1447',
                'academic_year_id' => $this->year->id,
                'academic_quarter_id' => $this->quarter->id,
                'effective_start_date' => '2026-11-01',
                'effective_end_date' => '2026-12-31',
            ]);

        $createPeriod->assertStatus(201)
            ->assertJsonPath('data.name', 'Jadwal Periode 1447')
            ->assertJsonPath('data.is_active', false)
            ->assertJsonPath('data.validity_status', 'draft');

        $periodId = $createPeriod->json('data.id');

        // Tambahkan slot pelajaran ke jadwal draft
        $createSlot = $this->actingAs($this->admin, 'api')
            ->postJson('/api/main/schedules', [
                'schedule_period_id' => $periodId,
                'class_group_id' => $this->classGroup->id,
                'study_id' => $this->study->id,
                'teacher_id' => $this->teacher->id,
                'lesson_hour_id' => $this->lessonHour->id,
                'day' => 4, // Kamis (2026-11-26 adalah Kamis)
            ]);

        $createSlot->assertStatus(201)
            ->assertJsonPath('data.schedule_period_id', $periodId);

        // Karena belum diaktifkan, dayGrid dan GET /main/schedules (tanpa schedule_period_id) TIDAK mengembalikannya
        $dayGridDraft = $this->actingAs($this->admin, 'api')
            ->getJson("/api/main/journals/day-grid?class_group_id={$this->classGroup->id}&date=2026-11-26");

        $dayGridDraft->assertStatus(200)
            ->assertJsonCount(0, 'data.hours');

        $liveSchedulesDraft = $this->actingAs($this->admin, 'api')
            ->getJson("/api/main/schedules?academic_year_id={$this->year->id}");
        $liveSchedulesDraft->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // Saat di-filter dengan schedule_period_id spesifik, draft tetap bisa diedit/dilihat di halaman penyusunan jadwal
        $draftList = $this->actingAs($this->admin, 'api')
            ->getJson("/api/main/schedules?schedule_period_id={$periodId}");
        $draftList->assertStatus(200)
            ->assertJsonCount(1, 'data');

        // Aktifkan / berlakukan Jadwal Periode 1447
        Carbon::setTestNow('2026-11-26 10:00:00');
        $activate = $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$periodId}/activate");

        $activate->assertStatus(200)
            ->assertJsonPath('data.is_active', true)
            ->assertJsonPath('data.validity_status', 'active');

        // Sekarang dayGrid pada tanggal di dalam masa berlaku (2026-11-26) memunculkan jadwal
        $dayGridActive = $this->actingAs($this->admin, 'api')
            ->getJson("/api/main/journals/day-grid?class_group_id={$this->classGroup->id}&date=2026-11-26");

        $dayGridActive->assertStatus(200)
            ->assertJsonCount(1, 'data.hours')
            ->assertJsonPath('data.hours.0.study_name', 'Fiqih');

        // Tanggal di luar masa berlaku (misal 2026-10-29, sebelum 2026-11-01) tidak memberlakukan jadwal ini
        $dayGridOutside = $this->actingAs($this->admin, 'api')
            ->getJson("/api/main/journals/day-grid?class_group_id={$this->classGroup->id}&date=2026-10-29");

        $dayGridOutside->assertStatus(200)
            ->assertJsonCount(0, 'data.hours');

        Carbon::setTestNow();
    }

    public function test_activating_a_schedule_period_deactivates_sibling_period_and_allows_draft_without_slot_collision(): void
    {
        $period1 = SchedulePeriod::create([
            'name' => 'Jadwal Periode 1447 Awal',
            'academic_year_id' => $this->year->id,
            'academic_quarter_id' => $this->quarter->id,
            'is_active' => true,
            'activated_at' => now(),
        ]);

        $period2 = SchedulePeriod::create([
            'name' => 'Jadwal Periode 1447 Revisi',
            'academic_year_id' => $this->year->id,
            'academic_quarter_id' => $this->quarter->id,
            'is_active' => false,
        ]);

        // Slot yang sama di hari & jam sama pada period1 dan period2 tidak boleh bentrok satu sama lain
        $this->actingAs($this->admin, 'api')->postJson('/api/main/schedules', [
            'schedule_period_id' => $period1->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_hour_id' => $this->lessonHour->id,
            'day' => 6,
        ])->assertStatus(201);

        $this->actingAs($this->admin, 'api')->postJson('/api/main/schedules', [
            'schedule_period_id' => $period2->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_hour_id' => $this->lessonHour->id,
            'day' => 6,
        ])->assertStatus(201);

        // Berlakukan period2 -> period1 otomatis nonaktif
        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period2->id}/activate")
            ->assertStatus(200)
            ->assertJsonPath('data.is_active', true);

        $this->assertFalse($period1->fresh()->is_active);
        $this->assertTrue($period2->fresh()->is_active);
    }

    public function test_reset_schedule_works_before_activation_and_is_blocked_after_activation(): void
    {
        $period = SchedulePeriod::create([
            'name' => 'Jadwal Periode 1447',
            'academic_year_id' => $this->year->id,
            'academic_quarter_id' => $this->quarter->id,
            'is_active' => false,
        ]);

        // Isi slot ke draft jadwal
        $this->actingAs($this->admin, 'api')->postJson('/api/main/schedules', [
            'schedule_period_id' => $period->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_hour_id' => $this->lessonHour->id,
            'day' => 1,
        ])->assertStatus(201);

        $this->assertEquals(1, LessonSchedule::where('schedule_period_id', $period->id)->count());

        // Reset sebelum diberlakukan -> sukses menghapus seluruh slot
        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period->id}/reset")
            ->assertStatus(200)
            ->assertJsonPath('data.deleted_count', 1);

        $this->assertEquals(0, LessonSchedule::withTrashed()->where('schedule_period_id', $period->id)->count());

        // Slot yang sama dapat diisi kembali setelah reset tanpa error unique constraint
        $slotResponse = $this->actingAs($this->admin, 'api')->postJson('/api/main/schedules', [
            'schedule_period_id' => $period->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_hour_id' => $this->lessonHour->id,
            'day' => 1,
        ])->assertStatus(201);

        $scheduleId = $slotResponse->json('data.id');

        // Aktifkan / berlakukan jadwal
        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period->id}/activate")
            ->assertStatus(200);

        // Reset setelah diberlakukan -> DITOLAK (422)
        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period->id}/reset")
            ->assertStatus(422);

        $this->assertEquals(1, LessonSchedule::where('schedule_period_id', $period->id)->count());

        // Jika sudah dipakai jurnal KBM lalu dinonaktifkan, reset tetap ditolak demi integritas riwayat
        TeachingJournal::create([
            'academic_year_id' => $this->year->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_schedule_id' => $scheduleId,
            'meeting_number' => 1,
            'date' => '2026-11-23',
            'topic' => 'Bab Thaharah',
            'teacher_status' => 'hadir',
        ]);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period->id}/deactivate")
            ->assertStatus(200);

        $this->actingAs($this->admin, 'api')
            ->postJson("/api/main/schedule-periods/{$period->id}/reset")
            ->assertStatus(422);
    }

    public function test_deleting_draft_schedule_period_cleans_up_its_schedule_slots(): void
    {
        $draft = SchedulePeriod::create([
            'name' => 'Draft Hapus 1447',
            'academic_year_id' => $this->year->id,
            'academic_quarter_id' => $this->quarter->id,
            'is_active' => false,
        ]);

        $this->actingAs($this->admin, 'api')->postJson('/api/main/schedules', [
            'schedule_period_id' => $draft->id,
            'class_group_id' => $this->classGroup->id,
            'study_id' => $this->study->id,
            'teacher_id' => $this->teacher->id,
            'lesson_hour_id' => $this->lessonHour->id,
            'day' => 6,
        ])->assertStatus(201);

        $this->assertEquals(1, LessonSchedule::where('schedule_period_id', $draft->id)->count());

        $this->actingAs($this->admin, 'api')
            ->deleteJson("/api/main/schedule-periods/{$draft->id}")
            ->assertStatus(200);

        $this->assertSoftDeleted('schedule_periods', ['id' => $draft->id]);
        $this->assertEquals(0, LessonSchedule::withTrashed()->where('schedule_period_id', $draft->id)->count());
    }
}
