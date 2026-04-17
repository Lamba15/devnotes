<?php

use App\Actions\Tracking\CreateIssue;
use App\Actions\Tracking\UpdateIssue;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\User;
use App\Support\WorkspaceAccess;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function createOwnerAndProject(): array
{
    WorkspaceAccess::forgetMainPlatformOwnerCache();
    $owner = User::factory()->create(['name' => 'Main Owner']);
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    return [$owner, $client, $project];
}

test('creating an issue without assignee_ids defaults to main platform owner', function () {
    [$owner, , $project] = createOwnerAndProject();

    $issue = app(CreateIssue::class)->handle($owner, $project, [
        'title' => 'Auto-assigned',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
    ]);

    expect($issue->assignees->pluck('id')->all())->toEqual([$owner->id]);
});

test('creating an issue with explicit assignee_ids uses exactly that set', function () {
    [$owner, $client, $project] = createOwnerAndProject();
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    foreach ([$alice, $bob] as $u) {
        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $u->id,
            'role' => 'admin',
        ]);
    }

    $issue = app(CreateIssue::class)->handle($owner, $project, [
        'title' => 'Multi',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'assignee_ids' => [$alice->id, $bob->id],
    ]);

    expect($issue->assignees->pluck('id')->sort()->values()->all())
        ->toEqual(collect([$alice->id, $bob->id])->sort()->values()->all());
});

test('creating an issue with empty assignee_ids leaves it unassigned', function () {
    [$owner, , $project] = createOwnerAndProject();

    $issue = app(CreateIssue::class)->handle($owner, $project, [
        'title' => 'Explicit none',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'assignee_ids' => [],
    ]);

    expect($issue->assignees)->toHaveCount(0);
});

test('updating an issue with assignee_ids replaces the set', function () {
    [$owner, $client, $project] = createOwnerAndProject();
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'T',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);
    $issue->assignees()->sync([$alice->id]);

    app(UpdateIssue::class)->handle($owner, $issue, [
        'title' => 'T',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'assignee_ids' => [$bob->id],
    ]);

    expect($issue->fresh()->assignees->pluck('id')->all())->toEqual([$bob->id]);
});

test('updating an issue without the assignee_ids key leaves assignees unchanged', function () {
    [$owner, , $project] = createOwnerAndProject();
    $alice = User::factory()->create();

    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'T',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);
    $issue->assignees()->sync([$alice->id]);

    app(UpdateIssue::class)->handle($owner, $issue, [
        'title' => 'T',
        'status' => 'done',
        'priority' => 'medium',
        'type' => 'task',
    ]);

    expect($issue->fresh()->assignees->pluck('id')->all())->toEqual([$alice->id]);
});

test('mainPlatformOwner resolves to lowest-id user with no client memberships', function () {
    WorkspaceAccess::forgetMainPlatformOwnerCache();
    $first = User::factory()->create();
    $second = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $first->id,
        'role' => 'admin',
    ]);
    WorkspaceAccess::forgetMainPlatformOwnerCache();

    expect(WorkspaceAccess::mainPlatformOwner()->id)->toBe($second->id);
});
