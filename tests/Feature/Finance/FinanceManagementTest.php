<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('authenticated users can visit the finance index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('finance.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('finance/index'));
});

test('transactions require a linked project', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('finance.transactions.store'), [
            'description' => 'Discovery session',
            'amount' => '1200.00',
            'occurred_at' => '2026-04-05',
        ])
        ->assertSessionHasErrors(['project_id']);
});

test('transactions are linked to projects and audited', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->actingAs($user)
        ->post(route('finance.transactions.store'), [
            'project_id' => $project->id,
            'description' => 'Discovery session',
            'amount' => '1200.00',
            'occurred_at' => '2026-04-05',
        ])
        ->assertRedirect(route('finance.index'));

    $transaction = Transaction::query()->where('description', 'Discovery session')->firstOrFail();

    expect($transaction->project_id)->toBe($project->id);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'transaction.created',
        'source' => 'manual_ui',
        'subject_type' => Transaction::class,
        'subject_id' => $transaction->id,
    ]);
});

test('invoices require a linked project', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('finance.invoices.store'), [
            'reference' => 'INV-001',
            'status' => 'draft',
            'amount' => '5000.00',
        ])
        ->assertSessionHasErrors(['project_id']);
});

test('invoices are linked to projects and audited', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->actingAs($user)
        ->post(route('finance.invoices.store'), [
            'project_id' => $project->id,
            'reference' => 'INV-001',
            'status' => 'draft',
            'amount' => '5000.00',
            'issued_at' => '2026-04-05',
        ])
        ->assertRedirect(route('finance.index'));

    $invoice = Invoice::query()->where('reference', 'INV-001')->firstOrFail();

    expect($invoice->project_id)->toBe($project->id);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'invoice.created',
        'source' => 'manual_ui',
        'subject_type' => Invoice::class,
        'subject_id' => $invoice->id,
    ]);
});

test('finance index includes project linked transactions and invoices', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Website rebuild',
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Discovery session',
        'amount' => 1200,
        'occurred_at' => '2026-04-05',
    ]);

    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-002',
        'status' => 'sent',
        'amount' => 5000,
        'issued_at' => '2026-04-05',
    ]);

    $this->actingAs($user)
        ->get(route('finance.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/index')
            ->has('transactions', 1)
            ->where('transactions.0.project.name', 'Website rebuild')
            ->where('transactions.0.project.client.name', $client->name)
            ->has('invoices', 1)
            ->where('invoices.0.project.name', 'Website rebuild')
            ->where('invoices.0.project.client.name', $client->name)
        );
});
