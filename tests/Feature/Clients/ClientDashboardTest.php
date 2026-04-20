<?php

use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ClientMembershipPermission;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('client owners see a dashboard scoped to their own client workspace', function () {
    $behaviorId = Behavior::query()->firstOrFail()->id;

    $client = Client::factory()->create([
        'name' => 'Ammar',
        'behavior_id' => $behaviorId,
    ]);
    $otherClient = Client::factory()->create([
        'name' => 'Other Client',
        'behavior_id' => $behaviorId,
    ]);

    $owner = User::factory()->create([
        'name' => 'Ammar Owner',
        'email_verified_at' => now(),
    ]);
    $teammate = User::factory()->create([
        'name' => 'Teammate',
        'email_verified_at' => now(),
    ]);
    $outsider = User::factory()->create([
        'name' => 'Other User',
        'email_verified_at' => now(),
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $owner->id,
        'role' => 'owner',
    ]);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $teammate->id,
        'role' => 'member',
    ]);
    ClientMembership::query()->create([
        'client_id' => $otherClient->id,
        'user_id' => $outsider->id,
        'role' => 'owner',
    ]);

    $activeStatus = ProjectStatus::factory()->create([
        'name' => 'Active',
        'slug' => 'active',
    ]);
    $pausedStatus = ProjectStatus::factory()->create([
        'name' => 'Paused',
        'slug' => 'paused',
    ]);

    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Client Portal',
        'budget' => 5000,
        'currency' => 'USD',
    ]);
    $otherProject = Project::factory()->create([
        'client_id' => $otherClient->id,
        'status_id' => $pausedStatus->id,
        'name' => 'External Project',
        'budget' => 3000,
        'currency' => 'USD',
    ]);

    $todoIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Homepage revision',
        'description' => 'Refresh the homepage blocks.',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'feature',
        'creator_id' => $owner->id,
        'due_date' => now()->subDay()->toDateString(),
    ]);

    $doneIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Invoice copy fix',
        'description' => 'Polish the invoice wording.',
        'status' => 'done',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);
    $doneIssue->forceFill([
        'updated_at' => now()->subDays(2),
    ])->save();

    $externalIssue = Issue::query()->create([
        'project_id' => $otherProject->id,
        'title' => 'Should not leak',
        'description' => 'This belongs to another client.',
        'status' => 'done',
        'priority' => 'low',
        'type' => 'bug',
        'creator_id' => $outsider->id,
    ]);
    $externalIssue->forceFill([
        'created_at' => now()->addMinute(),
        'updated_at' => now()->addMinute(),
    ])->save();

    $board = Board::query()->create([
        'project_id' => $project->id,
        'created_by' => $owner->id,
        'name' => 'Execution Board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
    ]);
    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'column_id' => $column->id,
        'issue_id' => $todoIssue->id,
        'position' => 1,
    ]);

    Board::query()->create([
        'project_id' => $otherProject->id,
        'created_by' => $outsider->id,
        'name' => 'Other Board',
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Initial payment',
        'amount' => 1200,
        'category' => 'retainer',
        'currency' => 'USD',
        'occurred_date' => now()->subDays(3)->toDateString(),
    ]);
    Transaction::query()->create([
        'project_id' => $otherProject->id,
        'description' => 'Should not leak',
        'amount' => 900,
        'category' => 'other',
        'currency' => 'USD',
        'occurred_date' => now()->toDateString(),
    ]);

    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-AMMAR-001',
        'status' => 'pending',
        'currency' => 'USD',
        'subtotal_amount' => 800,
        'discount_total_amount' => 0,
        'amount' => 800,
        'issued_at' => now()->subDays(2)->toDateString(),
        'due_at' => now()->addDays(5)->toDateString(),
    ]);
    Invoice::query()->create([
        'project_id' => $otherProject->id,
        'reference' => 'INV-OTHER-001',
        'status' => 'paid',
        'currency' => 'USD',
        'subtotal_amount' => 200,
        'discount_total_amount' => 0,
        'amount' => 200,
        'issued_at' => now()->toDateString(),
        'due_at' => now()->addDays(3)->toDateString(),
        'paid_at' => now()->toDateString(),
    ]);

    $this->actingAs($owner)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('client.name', 'Ammar')
            ->where('summary.members_count', 2)
            ->where('summary.projects_count', 1)
            ->where('summary.issues_count', 2)
            ->where('summary.boards_count', 1)
            ->where('stats.members.count', 2)
            ->where('stats.projects.count', 1)
            ->where('stats.issues.count', 2)
            ->where('stats.open_issues.count', 1)
            ->where('stats.boards.count', 1)
            ->where('stats.invoices.count', 1)
            ->where('stats.transactions.count', 1)
            ->where('finance_analysis.overall.project_count', 1)
            ->where('finance_analysis.overall.transaction_count', 1)
            ->where('finance_analysis.overall.invoice_count', 1)
            ->where('finance_analysis.overall.running_account.amount', 400)
            ->where('finance_analysis.overall.relationship_volume.amount', 800)
            ->where('finance_analysis.overall.transaction_volume.amount', 1200)
            ->where('monthly_income.0.net', 1200)
            ->where('monthly_closed_issues.0.count', 1)
            ->where('issue_distribution.by_status.todo', 1)
            ->where('issue_distribution.by_status.done', 1)
            ->where('issue_distribution.by_priority.high', 1)
            ->where('issue_distribution.by_type.feature', 1)
            ->where('issue_distribution.overdue_count', 1)
            ->where('issue_distribution.unassigned_count', 1)
            ->where('board_summary.total_boards', 1)
            ->where('board_summary.placed_issues', 1)
            ->where('board_summary.backlog_count', 0)
            ->where('project_health.top_projects.0.name', 'Client Portal')
            ->where('project_health.top_projects.0.issues_count', 2)
            ->where('recent_projects.0.name', 'Client Portal')
            ->where('recent_issues.0.title', 'Homepage revision')
            ->where('recent_issues.1.title', 'Invoice copy fix')
        );
});

test('client members without finance access do not receive finance dashboard data', function () {
    $behaviorId = Behavior::query()->firstOrFail()->id;

    $client = Client::factory()->create([
        'behavior_id' => $behaviorId,
    ]);
    $member = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    ClientMembershipPermission::query()->create([
        'client_membership_id' => $membership->id,
        'permission_name' => ClientPermissionCatalog::PROJECTS_READ,
        'granted_by' => null,
    ]);
    ClientMembershipPermission::query()->create([
        'client_membership_id' => $membership->id,
        'permission_name' => ClientPermissionCatalog::ISSUES_READ,
        'granted_by' => null,
    ]);

    $project = Project::factory()->create([
        'client_id' => $client->id,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Hidden payment',
        'amount' => 500,
        'category' => 'retainer',
        'currency' => 'USD',
        'occurred_date' => now()->toDateString(),
    ]);
    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-HIDDEN-001',
        'status' => 'pending',
        'currency' => 'USD',
        'subtotal_amount' => 500,
        'discount_total_amount' => 0,
        'amount' => 500,
        'issued_at' => now()->toDateString(),
    ]);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->missing('stats.invoices')
            ->missing('stats.transactions')
            ->where('finance_analysis.overall.project_count', 0)
            ->where('finance_analysis.overall.transaction_count', 0)
            ->where('finance_analysis.overall.invoice_count', 0)
            ->where('finance_analysis.by_currency', [])
            ->where('monthly_income', [])
        );
});
