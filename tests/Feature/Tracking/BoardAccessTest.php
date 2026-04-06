<?php

use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('viewer with project access can view a board and its backlog', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Delivery board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => false,
    ]);
    $backlogIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Backlog issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);
    $placedIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Placed issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'bug',
        'creator_id' => User::factory()->create()->id,
    ]);

    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $placedIssue->id,
        'column_id' => $column->id,
        'position' => 1,
    ]);

    $viewer = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('boards/show')
            ->where('board.id', $board->id)
            ->has('backlog', 1)
            ->where('backlog.0.title', 'Backlog issue')
            ->has('columns', 1)
            ->where('columns.0.name', 'Doing')
            ->has('columns.0.issues', 1)
            ->where('columns.0.issues.0.title', 'Placed issue')
            ->where('can_move_issues', false)
        );

    expect($backlogIssue->fresh()->status)->toBe('todo');
});

test('member without board access cannot view a board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Restricted board',
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
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertForbidden();
});

test('member with board access can move issues on that board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Delivery board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => true,
        'mapped_status' => 'in_progress',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Move me',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
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

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('boards.issues.move', $board), [
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ])
        ->assertRedirect(route('clients.projects.boards.show', [$client, $project, $board]));

    $this->assertDatabaseHas('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
    ]);

    expect($issue->fresh()->status)->toBe('in_progress');
});

test('viewer cannot move issues on a board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Viewer board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => false,
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Read only issue',
        'status' => 'todo',
        'priority' => 'low',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);
    $viewer = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    $this->actingAs($viewer)
        ->post(route('boards.issues.move', $board), [
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
    ]);
});

test('client admins can move issues on any client board without explicit board access', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Admin board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Done',
        'position' => 1,
        'updates_status' => true,
        'mapped_status' => 'done',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Admin issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->post(route('boards.issues.move', $board), [
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ])
        ->assertRedirect(route('clients.projects.boards.show', [$client, $project, $board]));

    expect($issue->fresh()->status)->toBe('done');
});

test('invalid placements are removed back to backlog when issue status changes away from mapped status', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Status board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Done',
        'position' => 1,
        'updates_status' => true,
        'mapped_status' => 'done',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Status drift issue',
        'status' => 'done',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);

    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
        'position' => 1,
    ]);

    $issue->update(['status' => 'todo']);

    $this->actingAs($owner)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('backlog', 1)
            ->where('backlog.0.title', 'Status drift issue')
            ->has('columns.0.issues', 0)
        );

    $this->assertDatabaseMissing('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
    ]);
});
