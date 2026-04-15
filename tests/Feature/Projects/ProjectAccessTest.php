<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
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

test('client members only see projects they are explicitly assigned to', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $allowedProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Allowed project',
    ]);
    Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Hidden project',
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $allowedProject->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->has('projects', 1)
            ->where('projects.0.id', $allowedProject->id)
            ->where('projects.0.name', 'Allowed project')
        );
});

test('client members without finance permission do not receive project finance summaries', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Assigned project',
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Deposit',
        'amount' => 500,
        'currency' => 'EGP',
        'occurred_date' => '2026-04-01',
    ]);
    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-HIDDEN-001',
        'status' => 'pending',
        'amount' => 800,
        'currency' => 'EGP',
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->where('projects.0.name', 'Assigned project')
            ->where('projects.0.running_account.amount', null)
            ->where('projects.0.relationship_volume.amount', null)
            ->where('projects.0.can_view_finance_summary', false)
        );
});

test('client members with finance permission receive project finance summaries', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Finance visible project',
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $membership->permissions()->create([
        'permission_name' => ClientPermissionCatalog::FINANCE_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    Transaction::query()->create([
        'project_id' => $project->id,
        'description' => 'Deposit',
        'amount' => 500,
        'currency' => 'EGP',
        'occurred_date' => '2026-04-01',
    ]);
    Invoice::query()->create([
        'project_id' => $project->id,
        'reference' => 'INV-VISIBLE-001',
        'status' => 'pending',
        'amount' => 800,
        'currency' => 'EGP',
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->where('projects.0.name', 'Finance visible project')
            ->where('projects.0.running_account.amount', -300)
            ->where('projects.0.relationship_volume.amount', 800)
            ->where('projects.0.can_view_finance_summary', true)
        );
});

test('client admins can see all client projects without explicit project memberships', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    Project::factory()->count(2)->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.projects.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/index')
            ->has('projects', 2)
        );
});

test('project users can open an assigned project details page', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Allowed project',
        'description' => 'Project details page',
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $membership->permissions()->create([
        'permission_name' => ClientPermissionCatalog::PROJECTS_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.show', [$client, $project]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('projects/show')
            ->where('project.id', $project->id)
            ->where('project.name', 'Allowed project')
            ->where('project.description', 'Project details page')
            ->where('can_manage_project', false)
        );
});

test('client users cannot open a project details page without project access', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.projects.show', [$client, $project]))
        ->assertForbidden();
});

test('client users cannot access projects for a different client', function () {
    $allowedClient = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $blockedClient = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $allowedClient->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.projects.index', $blockedClient))
        ->assertForbidden();
});

test('viewers cannot create projects', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();
    $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    $this->actingAs($viewer)
        ->post(route('clients.projects.store', $client), [
            'name' => 'Viewer project',
            'status_id' => $status->id,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('projects', [
        'client_id' => $client->id,
        'name' => 'Viewer project',
    ]);
});

test('client scoped users cannot access the cross client projects index', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.all'))
        ->assertForbidden();
});

test('members cannot create projects', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($member)
        ->post(route('clients.projects.store', $client), [
            'name' => 'Member project',
            'status_id' => $status->id,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('projects', [
        'client_id' => $client->id,
        'name' => 'Member project',
    ]);
});
