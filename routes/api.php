<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;

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
});

// Master Data Routes (Protected by JWT & AutoProvision)
Route::prefix('master')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Endpoints for Educational Institutions, Academic Years, Subjects, etc.
});

// Main Academic & KBM Routes (Protected by JWT & AutoProvision)
Route::prefix('main')->middleware(['autoprovision', 'auth:api'])->group(function () {
    // Endpoints for Schedules, Presence, Assessment, ReportCards, etc.
});
