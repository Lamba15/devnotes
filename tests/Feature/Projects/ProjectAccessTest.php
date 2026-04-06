<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
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
