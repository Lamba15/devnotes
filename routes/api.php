<?php

use App\Http\Controllers\PublicAnalyticsController;
use App\Http\Controllers\PublicPortfolioController;
use Illuminate\Http\Middleware\SetCacheHeaders;
use Illuminate\Support\Facades\Route;

Route::post('analytics/events', [PublicAnalyticsController::class, 'store'])
    ->middleware('throttle:analytics')
    ->name('api.analytics.events.store');

Route::prefix('portfolio')
    ->name('api.portfolio.')
    ->middleware(SetCacheHeaders::using(['public' => true, 'max_age' => 60]))
    ->group(function () {
        Route::get('projects', [PublicPortfolioController::class, 'projects'])->name('projects.index');
        Route::get('projects/{project}', [PublicPortfolioController::class, 'project'])->name('projects.show');
        Route::get('skills', [PublicPortfolioController::class, 'skills'])->name('skills.index');
        Route::get('sections', [PublicPortfolioController::class, 'sections'])->name('sections.index');
        Route::get('sections/{key}', [PublicPortfolioController::class, 'section'])->name('sections.show');
        Route::get('feedback', [PublicPortfolioController::class, 'feedback'])->name('feedback.index');
    });
