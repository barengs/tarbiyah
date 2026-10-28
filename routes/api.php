<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\Master\EducationalInstitutionController;
use App\Http\Controllers\Api\Master\EducationController;
use App\Http\Controllers\Api\Master\AcademicYearController;
use App\Http\Controllers\Api\Master\AcademicQuarterController;
use App\Http\Controllers\Api\Master\TeacherController;
use App\Http\Controllers\Api\Master\StudentController;
use App\Http\Controllers\Api\Master\StudyController;
use App\Http\Controllers\Api\Master\LessonHourController;
use App\Http\Controllers\Api\Master\ClassGroupController;
use App\Http\Controllers\Api\Master\ClassPromotionController;
use App\Http\Controllers\Api\Master\EducationClassController;
use App\Http\Controllers\Api\Master\LessonScheduleController;
use App\Http\Controllers\Api\Main\DashboardController;
use App\Http\Controllers\Api\Main\TeachingJournalController;
use App\Http\Controllers\Api\Main\AssessmentController;
use App\Http\Controllers\Api\Main\ReportCardController;
use App\Http\Controllers\Api\Internal\InternalStudentController;

/*
|--------------------------------------------------------------------------
| Tarbiyah (Education Management) API Routes
|--------------------------------------------------------------------------
*/

// Health Check
Route::get('ping', function () {
    return response()->json([
        'status'    => 'ok',
        'service'   => 'tarbiyah-education-be',
        'version'   => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});

// Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('login',   [AuthController::class, 'login']);
    Route::post('refresh', [AuthController::class, 'refresh']);
    Route::post('sso',     [AuthController::class, 'ssoHandover']);

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('profile', [AuthController::class, 'me']);
        Route::get('menus',   [AuthController::class, 'menus']);
    });
});

// Internal API (Service-to-Service communication via X-Internal-Key)
Route::prefix('internal')->middleware('internal.key')->group(function () {
    Route::get('health', function () {
        return response()->json([
            'status'  => 'ok',
            'service' => 'tarbiyah',
            'message' => 'Internal communication channel established.',
        ]);
    });

    // Endpoint sinkronisasi santri dari SMPT backend
    Route::post('students/sync', [InternalStudentController::class, 'sync']);
    Route::post('students/sync-bulk', [InternalStudentController::class, 'bulkSync']);
});

// Security & Role/Menu/User Management (Admin & Superadmin only)
Route::prefix('security')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Menu Management
    Route::get('menus', [SecurityController::class, 'getMenus']);
    Route::post('menus/reorder', [SecurityController::class, 'reorderMenus']);
    Route::post('menus', [SecurityController::class, 'storeMenu']);
    Route::put('menus/{id}', [SecurityController::class, 'updateMenu']);
    Route::delete('menus/{id}', [SecurityController::class, 'destroyMenu']);

    // Role Management & Matrix
    Route::get('roles', [SecurityController::class, 'getRoles']);
    Route::post('roles', [SecurityController::class, 'storeRole']);
    Route::put('roles/{id}', [SecurityController::class, 'updateRole']);
    Route::delete('roles/{id}', [SecurityController::class, 'destroyRole']);
    Route::post('roles/{id}/menus', [SecurityController::class, 'syncRoleMenus']);
    Route::post('roles/{id}/permissions', [SecurityController::class, 'syncRolePermissions']);

    // Permissions List
    Route::get('permissions', [SecurityController::class, 'getPermissions']);

    // User Management
    Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword']);
    Route::apiResource('users', UserController::class);
});

// Master Data Routes (Protected by JWT & AutoProvision)
Route::prefix('master')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Institusi Pendidikan
    Route::apiResource('institutions', EducationalInstitutionController::class);

    // Jenjang Pendidikan per Institusi
    Route::apiResource('educations', EducationController::class);

    // Tahun Ajaran & Kalender Akademik
    Route::get('academic-years/active', [AcademicYearController::class, 'active']);
    Route::patch('academic-years/{id}/set-active', [AcademicYearController::class, 'setActive']);
    Route::apiResource('academic-years', AcademicYearController::class);

    // Periode Pendidikan Triwulan (Sub-Akademik Pesantren)
    Route::patch('academic-quarters/{id}/set-active', [AcademicQuarterController::class, 'setActive']);
    Route::apiResource('academic-quarters', AcademicQuarterController::class);

    // Data Guru (Guru Pesantren & Guru Luar)
    Route::post('teachers/{id}/studies', [TeacherController::class, 'syncStudies']);
    Route::apiResource('teachers', TeacherController::class);

    // Data Siswa (Santri Mukim & Murid Reguler Luar)
    Route::get('students/unassigned', [StudentController::class, 'unassigned']);
    Route::post('students/bulk-assign', [StudentController::class, 'bulkAssign']);
    Route::post('students/bulk-assign-program', [StudentController::class, 'bulkAssignProgram']);
    Route::get('students/generate-nis', [StudentController::class, 'generateNis']);
    Route::get('students/pull-preview', [StudentController::class, 'previewPullFromSmpt']);
    Route::post('students/pull-from-smpt', [StudentController::class, 'pullFromSmpt']);
    Route::apiResource('students', StudentController::class);

    // Mata Pelajaran (Studies)
    Route::apiResource('studies', StudyController::class);

    // Jam Pelajaran (Lesson Hours)
    Route::apiResource('lesson-hours', LessonHourController::class);

    // Tingkat Kelas (Education Classes)
    Route::apiResource('education-classes', EducationClassController::class);
    Route::apiResource('education-class', EducationClassController::class);

    // Kenaikan Kelas (Class Promotion) & Mutasi Santri
    Route::get('class-groups/{id}/promotion-candidates', [ClassPromotionController::class, 'candidates']);
    Route::post('class-groups/bulk-promote', [ClassPromotionController::class, 'bulkPromote']);

    // Rombongan Belajar (Class Groups) & Halaqah
    Route::post('class-groups/{id}/students', [ClassGroupController::class, 'addStudent']);
    Route::delete('class-groups/{id}/students/{student_id}', [ClassGroupController::class, 'removeStudent']);
    Route::post('class-groups/{id}/promote-tahfidz', [ClassGroupController::class, 'promoteTahfidzLevel']);
    Route::post('class-groups/{id}/assign-subject', [ClassGroupController::class, 'assignSubject']);
    Route::apiResource('class-groups', ClassGroupController::class);
});

// Main Academic, KBM & Penilaian Routes (Protected by JWT & AutoProvision)
Route::prefix('main')->middleware(['autoprovision', 'auth:api'])->group(function () {
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    
    // Jadwal Pelajaran (Lesson Schedules)
    Route::post('schedules/copy-period', [LessonScheduleController::class, 'copyPeriod']);
    Route::post('schedules/copy-academic-year', [LessonScheduleController::class, 'copyAcademicYear']);
    Route::apiResource('schedules', LessonScheduleController::class);

    // Jurnal Pembelajaran & Presensi KBM Guru
    Route::get('journals/range-grid', [TeachingJournalController::class, 'rangeGrid']);
    Route::post('journals/save-multiday-grid', [TeachingJournalController::class, 'saveMultiDayGrid']);
    Route::get('journals/list-with-presence', [TeachingJournalController::class, 'listWithPresenceSummary']);
    Route::get('journals/day-grid', [TeachingJournalController::class, 'dayGrid']);
    Route::post('journals/save-day-grid', [TeachingJournalController::class, 'saveDayGrid']);
    Route::get('journals/sheet', [TeachingJournalController::class, 'sheet']);
    Route::post('journals/batch-presence', [TeachingJournalController::class, 'batchPresence']);
    Route::post('journals/{id}/presences', [TeachingJournalController::class, 'updatePresences']);
    Route::get('journals/recap', [TeachingJournalController::class, 'recap']);
    Route::apiResource('journals', TeachingJournalController::class);

    // Penilaian & Asesmen Siswa
    Route::get('assessments/categories', [AssessmentController::class, 'categories']);
    Route::get('assessments/gradebook', [AssessmentController::class, 'classGradebook']);
    Route::get('assessments/exam-eligibility', [AssessmentController::class, 'examEligibility']);
    Route::get('assessments/class-exam-eligibility/{class_group_id}', [AssessmentController::class, 'classExamEligibility']);
    Route::post('assessments/{id}/scores', [AssessmentController::class, 'saveScores']);
    Route::apiResource('assessments', AssessmentController::class);

    // Buku Rapor Digital Siswa & Export PDF
    Route::post('reports/generate', [ReportCardController::class, 'generate']);
    Route::get('reports/{id}/pdf', [ReportCardController::class, 'exportPdf']);
    Route::patch('reports/{id}/notes', [ReportCardController::class, 'updateNotes']);
    Route::apiResource('reports', ReportCardController::class);
});
