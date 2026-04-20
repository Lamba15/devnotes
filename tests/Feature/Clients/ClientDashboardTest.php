<?php

use App\Models\Behavior;
use App\Models\Board;
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

function dashboardGrantPermissions(ClientMembership $membership, array $permissions): void
{
    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
        ClientMembershipPermission::query()->create([
            'client_membership_id' => $membership->id,
            'permission_name' => $permission,
        ]);
    }
}

function dashboardSeedClientWorld(Client $client): array
{
    $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Primary Project',
    ]);

    $creator = User::factory()->create();

    $openIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Open client issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'task',
        'creator_id' => $creator->id,
    ]);

    $doneIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Done client issue',
        'status' => 'done',
        'priority' => 'low',
        'type' => 'bug',
        'creator_id' => $creator->id,
    ]);

    Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Primary Board',
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Client payment',
        'amount' => 500,
        'currency' => 'USD',
        'occurred_date' => '2026-04-01',
    ]);

    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-C-001',
        'amount' => 1000,
        'subtotal_amount' => 1000,
        'discount_total_amount' => 0,
        'status' => 'pending',
        'currency' => 'USD',
        'issued_at' => '2026-04-01',
    ]);

    return [$project, $openIssue, $doneIssue];
}

test('platform owner sees full dashboard for a client including finance', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Ammar Holdings',
    ]);

    [$project] = dashboardSeedClientWorld($client);

    $platformOwner = User::factory()->create();

    $this->actingAs($platformOwner)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('client.id', $client->id)
            ->where('can_access_finance', true)
            ->has('dashboard_stats.projects')
            ->where('dashboard_stats.projects.count', 1)
            ->where('dashboard_stats.issues.count', 2)
            ->where('dashboard_stats.open_issues.count', 1)
            ->where('dashboard_stats.boards.count', 1)
            ->has('dashboard_stats.invoices')
            ->has('dashboard_stats.transactions')
            ->where('dashboard_stats.invoices.count', 1)
            ->where('dashboard_stats.transactions.count', 1)
            ->has('monthly_income', 1)
            ->has('monthly_closed_issues', 1)
            ->where('monthly_closed_issues.0.count', 1)
            ->has('issue_distribution.by_status')
            ->where('issue_distribution.by_status.todo', 1)
            ->where('issue_distribution.by_status.done', 1)
            ->has('project_health.by_status')
            ->has('top_projects_by_issues', 1)
            ->where('top_projects_by_issues.0.id', $project->id)
            ->where('top_projects_by_issues.0.issues_count', 2)
            ->has('finance_analysis.by_currency')
            ->has('recent_issues', 2)
            ->has('board_summary')
        );
});

test('client owner sees dashboard for own client with finance access', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    dashboardSeedClientWorld($client);

    $clientOwner = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $clientOwner->id,
        'role' => 'owner',
    ]);

    $this->actingAs($clientOwner)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('can_access_finance', true)
            ->where('can_manage_members', true)
            ->where('can_view_internal_client_profile', false)
            ->has('dashboard_stats.invoices')
            ->has('dashboard_stats.transactions')
            ->has('finance_analysis.by_currency')
            ->has('monthly_income', 1)
        );
});

test('client member without finance permission sees dashboard but no finance sections', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    [$project] = dashboardSeedClientWorld($client);

    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    dashboardGrantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_READ,
        ClientPermissionCatalog::BOARDS_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('can_access_finance', false)
            ->where('finance_analysis', null)
            ->has('dashboard_stats.projects')
            ->has('dashboard_stats.issues')
            ->missing('dashboard_stats.invoices')
            ->missing('dashboard_stats.transactions')
            ->where('monthly_income', [])
        );
});

test('dashboard data is scoped: no leakage from other clients', function () {
    $ownClient = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Own Client',
    ]);
    $otherClient = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Other Client',
    ]);

    [$ownProject] = dashboardSeedClientWorld($ownClient);
    [$otherProject] = dashboardSeedClientWorld($otherClient);

    $creator = User::factory()->create();

    // Extra issue in the OTHER client; must not appear in own dashboard.
    Issue::query()->create([
        'project_id' => $otherProject->id,
        'title' => 'Other client secret issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $creator->id,
    ]);
    Transaction::query()->create([
        'project_id' => $otherProject->id,
        'description' => 'Other client payment',
        'amount' => 9999,
        'currency' => 'USD',
        'occurred_date' => '2026-04-01',
    ]);

    $owner = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $ownClient->id,
        'user_id' => $owner->id,
        'role' => 'owner',
    ]);

    $this->actingAs($owner)
        ->get(route('clients.show', $ownClient))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('dashboard_stats.projects.count', 1)
            ->where('dashboard_stats.issues.count', 2)
            ->where('top_projects_by_issues.0.id', $ownProject->id)
            ->has('top_projects_by_issues', 1)
            ->has('recent_issues', 2)
            ->where('finance_analysis.overall.transaction_count', 1)
            ->where('finance_analysis.overall.invoice_count', 1)
        );
});

test('project-scoped member only sees issues from accessible projects on dashboard', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
    $accessibleProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Accessible Project',
    ]);
    $hiddenProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => $activeStatus->id,
        'name' => 'Hidden Project',
    ]);

    $creator = User::factory()->create();

    Issue::query()->create([
        'project_id' => $accessibleProject->id,
        'title' => 'Accessible issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $creator->id,
    ]);
    Issue::query()->create([
        'project_id' => $hiddenProject->id,
        'title' => 'Hidden issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $creator->id,
    ]);

    $member = User::factory()->create();
    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    dashboardGrantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $accessibleProject->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('dashboard_stats.projects.count', 1)
            ->where('dashboard_stats.issues.count', 1)
            ->has('recent_issues', 1)
            ->where('recent_issues.0.title', 'Accessible issue')
        );
});
