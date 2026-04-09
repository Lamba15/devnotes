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

test('moving an issue back to backlog removes its placement', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Backlog return board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => false,
    ]);
    $admin = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Return me',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $admin->id,
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
        'position' => 1,
    ]);

    $this->actingAs($admin)
        ->post(route('boards.issues.move', $board), [
            'issue_id' => $issue->id,
            'column_id' => null,
            'position' => 1,
        ])
        ->assertRedirect(route('clients.projects.boards.show', [$client, $project, $board]));

    $this->assertDatabaseMissing('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('backlog.0.title', 'Return me')
        );
});

test('member client boards index only lists boards they can access', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $visibleBoard = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Visible board',
    ]);
    $hiddenBoard = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Hidden board',
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
        'board_id' => $visibleBoard->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.boards.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/boards')
            ->has('boards', 1)
            ->where('boards.0.name', 'Visible board')
            ->where('boards.0.id', $visibleBoard->id)
        );
});

test('client boards index supports server backed search sorting and pagination', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Alpha project',
    ]);

    foreach (range(1, 14) as $index) {
        Board::query()->create([
            'project_id' => $project->id,
            'name' => sprintf('Extra %02d', $index),
        ]);
    }

    Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Target Alpha',
    ]);

    Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Target Zulu',
    ]);

    $this->actingAs($owner)
        ->get(route('clients.boards.index', [
            'client' => $client,
            'search' => 'Target',
            'sort_by' => 'name',
            'sort_direction' => 'desc',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/boards')
            ->where('boards.0.name', 'Target Zulu')
            ->where('boards.1.name', 'Target Alpha')
            ->where('filters.search', 'Target')
            ->where('filters.sort_by', 'name')
            ->where('filters.sort_direction', 'desc')
        );

    $this->actingAs($owner)
        ->get(route('clients.boards.index', [
            'client' => $client,
            'sort_by' => 'created_at',
            'sort_direction' => 'asc',
            'page' => 2,
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/boards')
            ->has('boards', 1)
            ->where('pagination.current_page', 2)
            ->where('pagination.last_page', 2)
            ->where('pagination.total', 16)
        );
});

test('client admins can create update and delete boards through dedicated pages', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Delivery project',
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->get(route('clients.boards.create', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('boards/create'));

    $this->actingAs($admin)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Sprint board',
            'columns' => [
                [
                    'name' => 'Ideas',
                    'updates_status' => false,
                    'mapped_status' => null,
                ],
                [
                    'name' => 'Doing',
                    'updates_status' => true,
                    'mapped_status' => 'in_progress',
                ],
            ],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Sprint board')->firstOrFail();

    $this->assertDatabaseHas('board_columns', [
        'board_id' => $board->id,
        'name' => 'Ideas',
        'position' => 1,
        'updates_status' => false,
    ]);
    $this->assertDatabaseHas('board_columns', [
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 2,
        'updates_status' => true,
        'mapped_status' => 'in_progress',
    ]);

    $board->load('columns');
    $ideasColumn = $board->columns->firstWhere('name', 'Ideas');
    $doingColumn = $board->columns->firstWhere('name', 'Doing');

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.created',
        'source' => 'manual_ui',
        'subject_type' => Board::class,
        'subject_id' => $board->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.boards.edit', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('boards/edit'));

    $this->actingAs($admin)
        ->put(route('clients.boards.update', [$client, $board]), [
            'name' => 'Renamed sprint board',
            'project_id' => $project->id,
            'columns' => [
                [
                    'id' => $doingColumn->id,
                    'name' => 'Now doing',
                    'updates_status' => true,
                    'mapped_status' => 'in_progress',
                ],
                [
                    'name' => 'Review',
                    'updates_status' => false,
                    'mapped_status' => null,
                ],
            ],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    expect($board->fresh()->name)->toBe('Renamed sprint board');
    $this->assertDatabaseHas('board_columns', [
        'board_id' => $board->id,
        'id' => $doingColumn->id,
        'name' => 'Now doing',
        'position' => 1,
    ]);
    $this->assertDatabaseHas('board_columns', [
        'board_id' => $board->id,
        'name' => 'Review',
        'position' => 2,
        'updates_status' => false,
    ]);
    $this->assertDatabaseMissing('board_columns', [
        'id' => $ideasColumn->id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.updated',
        'source' => 'manual_ui',
        'subject_type' => Board::class,
        'subject_id' => $board->id,
    ]);

    $this->actingAs($admin)
        ->delete(route('clients.boards.destroy', [$client, $board]))
        ->assertRedirect(route('clients.boards.index', $client));

    $this->assertDatabaseMissing('boards', ['id' => $board->id]);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.deleted',
        'source' => 'manual_ui',
        'subject_type' => Board::class,
        'subject_id' => $board->id,
    ]);
});

test('client admins can add columns directly from the board page', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Inline column board',
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->post(route('clients.boards.columns.store', [$client, $board]), [
            'name' => 'QA',
            'updates_status' => true,
            'mapped_status' => 'done',
        ])
        ->assertRedirect(route('clients.projects.boards.show', [$client, $project, $board]));

    $column = BoardColumn::query()->where('board_id', $board->id)->where('name', 'QA')->firstOrFail();

    expect($column->position)->toBe(1);
    expect($column->mapped_status)->toBe('done');

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.column_created',
        'source' => 'manual_ui',
        'subject_type' => BoardColumn::class,
        'subject_id' => $column->id,
    ]);
});
