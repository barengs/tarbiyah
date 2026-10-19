<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Master\EducationalInstitutionController;
use App\Http\Controllers\Api\Master\EducationController;
use App\Http\Controllers\Api\Master\AcademicYearController;
use App\Http\Controllers\Api\Master\TeacherController;
use App\Http\Controllers\Api\Master\StudentController;
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
});

// Main Academic & KBM Routes (Protected by JWT & AutoProvision)
Route::prefix('main')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Endpoints for Schedules, Presence, Assessment, ReportCards, etc.
});
