<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ClientMembershipPermission;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function grantFinancePermissions(ClientMembership $membership, array $permissions): void
{
    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
        ClientMembershipPermission::query()->create([
            'client_membership_id' => $membership->id,
            'permission_name' => $permission,
        ]);
    }
}

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

test('client members without finance permission cannot visit finance pages', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.finance.index', $client))
        ->assertForbidden();

    $this->actingAs($member)
        ->get(route('finance.transactions.index'))
        ->assertForbidden();
});

test('client members with finance permission can visit finance pages in their project scope', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $allowedProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Allowed finance project',
    ]);
    $blockedProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Blocked finance project',
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantFinancePermissions($membership, [ClientPermissionCatalog::FINANCE_READ]);

    ProjectMembership::query()->create([
        'project_id' => $allowedProject->id,
        'user_id' => $member->id,
    ]);

    Transaction::query()->create([
        'project_id' => $allowedProject->id,
        'description' => 'Allowed transaction',
        'amount' => 200,
        'occurred_date' => '2026-04-05',
    ]);
    Transaction::query()->create([
        'project_id' => $blockedProject->id,
        'description' => 'Blocked transaction',
        'amount' => 400,
        'occurred_date' => '2026-04-05',
    ]);

    $this->actingAs($member)
        ->get(route('clients.finance.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/finance')
            ->has('transactions', 1)
            ->where('transactions.0.description', 'Allowed transaction')
        );

    $this->actingAs($member)
        ->get(route('finance.transactions.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions')
            ->has('transactions', 1)
            ->where('transactions.0.description', 'Allowed transaction')
        );
});

test('client finance page exposes relationship analysis and timeline data', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Finance analysis project',
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Deposit',
        'amount' => 1000,
        'currency' => 'EGP',
        'occurred_date' => '2026-01-10',
    ]);
    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Refund',
        'amount' => -200,
        'currency' => 'EGP',
        'occurred_date' => '2026-03-05',
    ]);

    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-ANALYSIS-001',
        'status' => 'pending',
        'amount' => 1500,
        'currency' => 'EGP',
        'issued_at' => '2026-02-01',
    ]);
    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-ANALYSIS-002',
        'status' => 'paid',
        'amount' => 500,
        'currency' => 'EGP',
        'issued_at' => '2026-04-01',
        'paid_at' => '2026-04-10',
    ]);

    $this->actingAs($user)
        ->get(route('clients.finance.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/finance')
            ->where('analysis.overall.project_count', 1)
            ->where('analysis.overall.transaction_count', 2)
            ->where('analysis.overall.invoice_count', 2)
            ->where('analysis.overall.running_account.amount', -1200)
            ->where('analysis.overall.running_account.currency', 'EGP')
            ->where('analysis.by_currency.0.label', 'EGP')
            ->where('analysis.by_currency.0.client_owes_you', 1200)
            ->where('analysis.by_currency.0.you_owe_client', 0)
            ->where('analysis.by_currency.0.received_total', 1000)
            ->where('analysis.by_currency.0.refund_total', 200)
            ->where('analysis.by_currency.0.invoice_statuses.pending.amount', 1500)
            ->where('analysis.by_currency.0.invoice_statuses.paid.amount', 500)
            ->where('analysis.by_currency.0.timeline.default_granularity', 'month')
            ->has('analysis.by_currency.0.timeline.points', 4)
            ->where('analysis.by_currency.0.timeline.points.0.period', '2026-01')
            ->where('analysis.by_currency.0.timeline.points.3.period', '2026-04')
            ->where('analysis.by_currency.0.timeline.points.3.cumulative_invoiced', 2000)
            ->where('analysis.by_currency.0.timeline.points.3.cumulative_paid', 800)
            ->where('analysis.by_currency.0.timeline.points.3.running_account', -1200)
        );
});

test('client members with finance write permission can create transactions', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantFinancePermissions($membership, [ClientPermissionCatalog::FINANCE_WRITE]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('finance.transactions.store'), [
            'project_id' => $project->id,
            'description' => 'Member finance transaction',
            'amount' => '250.00',
            'occurred_date' => '2026-04-05',
        ])
        ->assertRedirect(route('finance.index'));

    $this->assertDatabaseHas('transactions', [
        'project_id' => $project->id,
        'description' => 'Member finance transaction',
    ]);
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
        'occurred_date' => '2026-04-05',
    ]);
    $invoice = Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-002',
        'status' => 'pending',
        'amount' => 5000,
        'issued_at' => '2026-04-05',
        'due_at' => '2026-04-20',
    ]);

    $this->actingAs($user)
        ->get(route('finance.transactions.show', $transaction))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions-show')
            ->where('transaction.description', 'Discovery session')
            ->where('transaction.project.name', 'Website rebuild')
            ->where('transaction.project.client.name', $client->name)
            ->where('transaction.pdf_url', route('finance.transactions.pdf', $transaction))
        );

    $this->actingAs($user)
        ->get(route('finance.invoices.show', $invoice))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/invoices-show')
            ->where('invoice.reference', 'INV-002')
            ->where('invoice.status', 'pending')
            ->where('invoice.due_at', '2026-04-20')
            ->where('invoice.project.name', 'Website rebuild')
            ->where('invoice.project.client.name', $client->name)
            ->has('invoice.items', 1)
        );
});

test('transactions require a linked project', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('finance.transactions.store'), [
            'description' => 'Discovery session',
            'amount' => '1200.00',
            'occurred_date' => '2026-04-05',
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
            'occurred_date' => '2026-04-05',
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
        ->assertRedirect(route('finance.invoices.index'));

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

test('itemized invoices calculate totals and expose a public pdf route', function () {
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
            'reference' => 'INV-STACKED-001',
            'status' => 'draft',
            'currency' => 'EGP',
            'issued_at' => '2026-04-05',
            'items' => [
                [
                    'description' => 'Discovery and planning',
                    'amount' => '1000.00',
                ],
                [
                    'description' => 'Implementation hours',
                    'hours' => '10',
                    'rate' => '100',
                ],
            ],
            'discounts' => [
                [
                    'label' => 'Discovery reduction',
                    'type' => 'fixed',
                    'value' => '200',
                    'target_type' => 'item',
                    'target_item_index' => '0',
                ],
                [
                    'label' => 'Invoice percentage discount',
                    'type' => 'percent',
                    'value' => '10',
                    'target_type' => 'invoice',
                ],
            ],
        ])
        ->assertRedirect(route('finance.invoices.index'));

    $invoice = Invoice::query()
        ->where('reference', 'INV-STACKED-001')
        ->with(['items.discounts', 'discounts'])
        ->firstOrFail();

    expect((float) $invoice->subtotal_amount)->toBe(2000.0)
        ->and((float) $invoice->discount_total_amount)->toBe(380.0)
        ->and((float) $invoice->amount)->toBe(1620.0)
        ->and($invoice->items)->toHaveCount(2)
        ->and($invoice->discounts)->toHaveCount(2)
        ->and($invoice->public_id)->not->toBeNull()
        ->and($invoice->public_pdf_path)->not->toBeNull();

    $this->get(route('invoices.public.show', $invoice->public_id))
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf');
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
        'occurred_date' => '2026-04-05',
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
        'occurred_date' => '2026-04-05',
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
        'status' => 'pending',
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

test('finance invoices index supports project status and currency filters', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
    $projectAlpha = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Alpha Project',
    ]);
    $projectBeta = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Beta Project',
    ]);

    Invoice::query()->create([
        'project_id' => $projectAlpha->id,
        'reference' => 'INV-PENDING-USD',
        'status' => 'pending',
        'amount' => 1000,
        'currency' => 'USD',
        'issued_at' => '2026-04-01',
        'due_at' => '2026-04-15',
    ]);
    Invoice::query()->create([
        'project_id' => $projectAlpha->id,
        'reference' => 'INV-PAID-USD',
        'status' => 'paid',
        'amount' => 1200,
        'currency' => 'USD',
        'issued_at' => '2026-04-02',
        'paid_at' => '2026-04-18',
    ]);
    Invoice::query()->create([
        'project_id' => $projectBeta->id,
        'reference' => 'INV-OVERDUE-EUR',
        'status' => 'overdue',
        'amount' => 1400,
        'currency' => 'EUR',
        'issued_at' => '2026-04-03',
        'due_at' => '2026-04-10',
    ]);

    $this->actingAs($user)
        ->get(route('finance.invoices.index', [
            'project_id' => [(string) $projectAlpha->id],
            'status' => ['pending'],
            'currency' => ['USD'],
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/invoices')
            ->has('invoices', 1)
            ->where('invoices.0.reference', 'INV-PENDING-USD')
            ->where('filters.project_id', [(string) $projectAlpha->id])
            ->where('filters.status', ['pending'])
            ->where('filters.currency', ['USD'])
            ->where('project_filter_options.0.label', "{$client->name} / Alpha Project")
            ->where('status_filter_options.1.value', 'pending')
            ->where('currency_filter_options.0.value', 'EUR')
        );
});

test('invoices persist status and payment dates from create and update flows', function () {
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
            'reference' => 'INV-DATES-001',
            'status' => 'pending',
            'currency' => 'EGP',
            'issued_at' => '2026-04-05',
            'due_at' => '2026-04-20',
            'items' => [
                [
                    'description' => 'Implementation',
                    'amount' => '1000.00',
                ],
            ],
        ])
        ->assertRedirect(route('finance.invoices.index'));

    $invoice = Invoice::query()->where('reference', 'INV-DATES-001')->firstOrFail();

    expect($invoice->status)->toBe('pending')
        ->and($invoice->due_at?->toDateString())->toBe('2026-04-20')
        ->and($invoice->paid_at)->toBeNull();

    $this->actingAs($user)
        ->put(route('finance.invoices.update', $invoice), [
            'project_id' => $project->id,
            'reference' => 'INV-DATES-001',
            'status' => 'paid',
            'currency' => 'EGP',
            'issued_at' => '2026-04-05',
            'due_at' => '2026-04-20',
            'paid_at' => '2026-04-22',
            'items' => [
                [
                    'description' => 'Implementation',
                    'amount' => '1000.00',
                ],
            ],
        ])
        ->assertRedirect(route('finance.invoices.index'));

    $invoice->refresh();

    expect($invoice->status)->toBe('paid')
        ->and($invoice->due_at?->toDateString())->toBe('2026-04-20')
        ->and($invoice->paid_at?->toDateString())->toBe('2026-04-22');
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
        'occurred_date' => '2026-04-01',
    ]);
    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Zulu payment',
        'amount' => 200,
        'occurred_date' => '2026-04-02',
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

test('finance transactions index supports project category currency and direction filters', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
    $projectAlpha = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Alpha Project',
    ]);
    $projectBeta = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Beta Project',
    ]);

    Transaction::query()->create([
        'project_id' => $projectAlpha->id,
        'description' => 'Hosting income',
        'amount' => 100,
        'category' => 'hosting',
        'currency' => 'USD',
        'occurred_date' => '2026-04-01',
    ]);
    Transaction::query()->create([
        'project_id' => $projectAlpha->id,
        'description' => 'Hosting expense',
        'amount' => -50,
        'category' => 'hosting',
        'currency' => 'USD',
        'occurred_date' => '2026-04-02',
    ]);
    Transaction::query()->create([
        'project_id' => $projectBeta->id,
        'description' => 'Design income',
        'amount' => 200,
        'category' => 'design',
        'currency' => 'EUR',
        'occurred_date' => '2026-04-03',
    ]);

    $this->actingAs($user)
        ->get(route('finance.transactions.index', [
            'project_id' => [(string) $projectAlpha->id],
            'category' => ['hosting'],
            'currency' => ['USD'],
            'direction' => ['expense'],
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('finance/transactions')
            ->has('transactions', 1)
            ->where('transactions.0.description', 'Hosting expense')
            ->where('filters.project_id', [(string) $projectAlpha->id])
            ->where('filters.category', ['hosting'])
            ->where('filters.currency', ['USD'])
            ->where('filters.direction', ['expense'])
            ->where('project_filter_options.0.label', "{$client->name} / Alpha Project")
            ->where('category_filter_options.0.value', 'design')
            ->where('currency_filter_options.0.value', 'EUR')
            ->where('direction_filter_options.0.value', 'income')
        );
});
