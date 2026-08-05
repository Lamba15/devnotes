<?php

use App\Models\AnalyticsSession;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('analytics:prune {--months=13}', function () {
    $months = max(1, min((int) $this->option('months'), 36));
    $deleted = AnalyticsSession::query()
        ->where('last_seen_at', '<', now()->subMonths($months))
        ->delete();

    $this->info("Pruned {$deleted} analytics sessions older than {$months} months.");
})->purpose('Delete expired first-party website analytics records');

Schedule::command('analytics:prune --months=13')
    ->dailyAt('03:20')
    ->withoutOverlapping();
