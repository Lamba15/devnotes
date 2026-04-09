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

test('authenticated users are redirected from finance index to transactions', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('finance.index'))
        ->assertRedirect('/finance/transactions');
});

test('authenticated users can visit the finance transactions page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('finance.transactions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('finance/transactions'));
});

test('authenticated users can visit the finance invoices page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('finance.invoices.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('finance/invoices'));
});

test('authenticated users can open transaction and invoice details pages', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Website rebuild',
    ]);
    $transaction = Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Discovery session',
        'amount' => 1200,
        'occurred_at' => '2026-04-05',
    ]);
    $invoice = Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-002',
        'status' => 'sent',
        'amount' => 5000,
        'issued_at' => '2026-04-05',
    ]);

    $this->actingAs($user)
        ->get(route('finance.transactions.show', $transaction))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions-show')
            ->where('transaction.description', 'Discovery session')
            ->where('transaction.project.name', 'Website rebuild')
            ->where('transaction.project.client.name', $client->name)
        );

    $this->actingAs($user)
        ->get(route('finance.invoices.show', $invoice))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/invoices-show')
            ->where('invoice.reference', 'INV-002')
            ->where('invoice.project.name', 'Website rebuild')
            ->where('invoice.project.client.name', $client->name)
        );
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

test('transactions can be deleted and deletion is audited', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $transaction = Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Delete transaction',
        'amount' => 250,
        'occurred_at' => '2026-04-05',
    ]);

    $this->actingAs($user)
        ->delete(route('finance.transactions.destroy', $transaction))
        ->assertRedirect(route('finance.transactions.index'));

    $this->assertDatabaseMissing('transactions', ['id' => $transaction->id]);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'transaction.deleted',
        'source' => 'manual_ui',
        'subject_type' => Transaction::class,
        'subject_id' => $transaction->id,
    ]);
});

test('invoices can be deleted and deletion is audited', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $invoice = Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-DELETE',
        'status' => 'draft',
        'amount' => 250,
    ]);

    $this->actingAs($user)
        ->delete(route('finance.invoices.destroy', $invoice))
        ->assertRedirect(route('finance.invoices.index'));

    $this->assertDatabaseMissing('invoices', ['id' => $invoice->id]);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $user->id,
        'event' => 'invoice.deleted',
        'source' => 'manual_ui',
        'subject_type' => Invoice::class,
        'subject_id' => $invoice->id,
    ]);
});

test('finance transactions page includes project linked transactions', function () {
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
        ->get(route('finance.transactions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions')
            ->has('transactions', 1)
            ->where('transactions.0.project.name', 'Website rebuild')
            ->where('transactions.0.project.client.name', $client->name)
        );
});

test('finance invoices page includes project linked invoices', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Website rebuild',
    ]);

    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-002',
        'status' => 'sent',
        'amount' => 5000,
        'issued_at' => '2026-04-05',
    ]);

    $this->actingAs($user)
        ->get(route('finance.invoices.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/invoices')
            ->where('invoices.0.project.name', 'Website rebuild')
            ->where('invoices.0.project.client.name', $client->name)
        );
});

test('finance transactions index supports server backed search and sorting', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Alpha payment',
        'amount' => 100,
        'occurred_at' => '2026-04-01',
    ]);
    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Zulu payment',
        'amount' => 200,
        'occurred_at' => '2026-04-02',
    ]);

    $this->actingAs($user)
        ->get(route('finance.transactions.index', [
            'search' => 'payment',
            'sort_by' => 'description',
            'sort_direction' => 'desc',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions')
            ->where('transactions.0.description', 'Zulu payment')
            ->where('transactions.1.description', 'Alpha payment')
            ->where('filters.search', 'payment')
            ->where('filters.sort_by', 'description')
            ->where('filters.sort_direction', 'desc')
        );
});
