<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Master\EducationalInstitutionController;
use App\Http\Controllers\Api\Master\EducationController;
use App\Http\Controllers\Api\Master\AcademicYearController;
use App\Http\Controllers\Api\Master\TeacherController;
use App\Http\Controllers\Api\Master\StudentController;
use App\Http\Controllers\Api\Master\StudyController;
use App\Http\Controllers\Api\Master\LessonHourController;
use App\Http\Controllers\Api\Master\ClassGroupController;
use App\Http\Controllers\Api\Master\LessonScheduleController;
use App\Http\Controllers\Api\Main\TeachingJournalController;
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

    Route::middleware('auth:api')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('profile', [AuthController::class, 'me']);
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

    // Data Guru (Guru Pesantren & Guru Luar)
    Route::apiResource('teachers', TeacherController::class);

    // Data Siswa (Santri Mukim & Murid Reguler Luar)
    Route::apiResource('students', StudentController::class);

    // Mata Pelajaran (Studies)
    Route::apiResource('studies', StudyController::class);

    // Jam Pelajaran (Lesson Hours)
    Route::apiResource('lesson-hours', LessonHourController::class);

    // Rombongan Belajar (Class Groups) & Halaqah Tahfidz
    Route::post('class-groups/{id}/students', [ClassGroupController::class, 'addStudent']);
    Route::delete('class-groups/{id}/students/{student_id}', [ClassGroupController::class, 'removeStudent']);
    Route::post('class-groups/{id}/promote-tahfidz', [ClassGroupController::class, 'promoteTahfidzLevel']);
    Route::post('class-groups/{id}/assign-subject', [ClassGroupController::class, 'assignSubject']);
    Route::apiResource('class-groups', ClassGroupController::class);
});

// Main Academic & KBM Routes (Protected by JWT & AutoProvision)
Route::prefix('main')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Jadwal Pelajaran (Lesson Schedules)
    Route::apiResource('schedules', LessonScheduleController::class);

    // Jurnal Pembelajaran & Presensi KBM Guru
    Route::post('journals/{id}/presences', [TeachingJournalController::class, 'updatePresences']);
    Route::get('journals/recap', [TeachingJournalController::class, 'recap']);
    Route::apiResource('journals', TeachingJournalController::class);
});
