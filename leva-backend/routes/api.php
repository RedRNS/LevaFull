<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;

// Auth
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Onboarding (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/onboarding', [OnboardingController::class, 'store']);
    Route::get('/me', [AuthController::class, 'me']);
});
