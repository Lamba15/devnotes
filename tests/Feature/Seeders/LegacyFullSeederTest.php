<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\SecretEntry;
use App\Models\Transaction;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

test('database seeder loads the legacy fuller dataset', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Client::count())->toBe(20)
        ->and(DB::table('client_phone_numbers')->count())->toBe(28)
        ->and(Project::count())->toBe(34)
        ->and(Transaction::count())->toBe(144)
        ->and(Invoice::count())->toBe(118)
        ->and(SecretEntry::count())->toBe(74);
});

test('database seeder maps legacy behaviors and project statuses', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Behavior::query()->where('slug', 'my-friend')->exists())->toBeTrue()
        ->and(Behavior::query()->where('slug', 'dont-like')->exists())->toBeTrue()
        ->and(ProjectStatus::query()->where('slug', 'active')->exists())->toBeTrue()
        ->and(ProjectStatus::query()->where('slug', 'paused')->exists())->toBeTrue()
        ->and(Project::query()->where('name', 'Tropical For Landscape')->firstOrFail()->status->slug)->toBe('completed');
});

test('database seeder aggregates legacy project notes and encrypts imported secrets', function () {
    $this->seed(DatabaseSeeder::class);

    $project = Project::query()->where('name', 'mahmoud el zainy ERP')->firstOrFail();

    expect($project->notes)->toContain('Legacy note - 2023-01-24 18:52:54')
        ->and($project->notes)->toContain('Legacy note - 2023-01-26 15:43:26');

    $secret = SecretEntry::query()->where('label', 'Main')->firstOrFail();

    expect(DB::table('secret_entries')->where('id', $secret->id)->value('secret_value'))
        ->not->toBe($secret->secret_value);
});

test('database seeder imports only project linked transactions and egp historical finance', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Transaction::query()->where('currency', 'EGP')->count())->toBe(144)
        ->and(Transaction::query()->whereNull('project_id')->count())->toBe(0)
        ->and(Invoice::query()->where('currency', 'EGP')->count())->toBe(118)
        ->and(Invoice::query()->where('status', 'paid')->count())->toBe(118);
});
