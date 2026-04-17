<?php

use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function trackingBoardsClientProject(string $clientName = 'C', string $projectName = 'P'): array
{
    $client = Client::factory()->create([
        'name' => $clientName,
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => $projectName,
    ]);

    return [$client, $project];
}

function trackingBoard(Project $project, ?User $creator = null, array $overrides = []): Board
{
    return Board::query()->create(array_merge([
        'project_id' => $project->id,
        'created_by' => $creator?->id,
        'name' => 'Board',
    ], $overrides));
}

function trackingBoardColumn(Board $board, string $name, int $position = 1): BoardColumn
{
    return BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => $name,
        'position' => $position,
    ]);
}

// ─── Access control ──────────────────────────────────────────────────────────

test('unauthenticated users are redirected from tracking boards to login', function () {
    $this->get(route('tracking.boards.index'))->assertRedirect(route('login'));
});

test('client-scoped users cannot visit tracking boards', function () {
    [$client] = trackingBoardsClientProject();
    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->get(route('tracking.boards.index'))
        ->assertForbidden();
});

test('platform owners can visit tracking boards', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('tracking/boards'));
});

// ─── Rendering + prop keys ───────────────────────────────────────────────────

test('tracking boards page exposes expected prop keys', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('tracking/boards')
            ->has('boards')
            ->has('pagination')
            ->has('filters')
            ->has('client_filter_options')
            ->has('project_filter_options')
            ->has('creator_filter_options')
        );
});

test('tracking boards page lists boards across all clients and projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingBoardsClientProject('A', 'P1');
    [, $projectB] = trackingBoardsClientProject('B', 'P2');

    trackingBoard($projectA, $owner, ['name' => 'Board A1']);
    trackingBoard($projectA, $owner, ['name' => 'Board A2']);
    trackingBoard($projectB, $owner, ['name' => 'Board B1']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertInertia(fn (Assert $page) => $page->has('boards', 3));
});

// ─── Search ──────────────────────────────────────────────────────────────────

test('search matches board name', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    trackingBoard($project, $owner, ['name' => 'Backlog kanban']);
    trackingBoard($project, $owner, ['name' => 'Bug triage']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['search' => 'kanban']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'Backlog kanban')
        );
});

test('search matches project or client name', function () {
    $owner = User::factory()->create();
    [, $acme] = trackingBoardsClientProject('Acme Corp', 'Apollo');
    [, $beta] = trackingBoardsClientProject('Beta Inc', 'Bullseye');

    trackingBoard($acme, $owner, ['name' => 'Alpha']);
    trackingBoard($beta, $owner, ['name' => 'Bravo']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['search' => 'acme']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'Alpha')
        );

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['search' => 'bullseye']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'Bravo')
        );
});

test('search matches creator name', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();
    $dana = User::factory()->create(['name' => 'Dana Scully']);

    trackingBoard($project, $dana, ['name' => 'By Dana']);
    trackingBoard($project, $owner, ['name' => 'By Owner']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['search' => 'dana']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'By Dana')
        );
});

// ─── Filters ─────────────────────────────────────────────────────────────────

test('client filter scopes to boards of selected clients projects', function () {
    $owner = User::factory()->create();
    [$clientA, $projectA] = trackingBoardsClientProject('A');
    [, $projectB] = trackingBoardsClientProject('B');

    trackingBoard($projectA, $owner, ['name' => 'A-board']);
    trackingBoard($projectB, $owner, ['name' => 'B-board']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['client_id' => [(string) $clientA->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'A-board')
        );
});

test('project filter scopes to selected projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingBoardsClientProject('C', 'X');
    [, $projectB] = trackingBoardsClientProject('C2', 'Y');

    trackingBoard($projectA, $owner, ['name' => 'AX']);
    trackingBoard($projectB, $owner, ['name' => 'BY']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['project_id' => [(string) $projectA->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'AX')
        );
});

test('creator filter narrows to boards created by selected users', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();
    $alice = User::factory()->create(['name' => 'Alice']);

    trackingBoard($project, $alice, ['name' => 'By Alice']);
    trackingBoard($project, $owner, ['name' => 'By Owner']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['created_by' => [(string) $alice->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'By Alice')
        );
});

test('created date range filters bound returned boards', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    $old = trackingBoard($project, $owner, ['name' => 'Old']);
    $old->created_at = '2026-01-01 10:00:00';
    $old->save();

    $new = trackingBoard($project, $owner, ['name' => 'New']);
    $new->created_at = '2026-03-15 12:00:00';
    $new->save();

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['created_from' => '2026-03-01']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'New')
        );

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['created_to' => '2026-01-15']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 1)
            ->where('boards.0.name', 'Old')
        );
});

// ─── Sorting ─────────────────────────────────────────────────────────────────

test('sort by name ascending and descending', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    trackingBoard($project, $owner, ['name' => 'Charlie']);
    trackingBoard($project, $owner, ['name' => 'Alpha']);
    trackingBoard($project, $owner, ['name' => 'Bravo']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'name', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('boards.0.name', 'Alpha')
            ->where('boards.1.name', 'Bravo')
            ->where('boards.2.name', 'Charlie')
        );
});

test('sort by columns_count orders boards', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    $b1 = trackingBoard($project, $owner, ['name' => 'One']);
    trackingBoardColumn($b1, 'A');

    $b3 = trackingBoard($project, $owner, ['name' => 'Three']);
    trackingBoardColumn($b3, 'A');
    trackingBoardColumn($b3, 'B', 2);
    trackingBoardColumn($b3, 'C', 3);

    $b2 = trackingBoard($project, $owner, ['name' => 'Two']);
    trackingBoardColumn($b2, 'A');
    trackingBoardColumn($b2, 'B', 2);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'columns_count', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('boards.0.name', 'One')
            ->where('boards.1.name', 'Two')
            ->where('boards.2.name', 'Three')
        );
});

test('sort by placements_count orders boards', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'I',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);

    $empty = trackingBoard($project, $owner, ['name' => 'Empty']);

    $full = trackingBoard($project, $owner, ['name' => 'Full']);
    $column = trackingBoardColumn($full, 'A');
    BoardIssuePlacement::query()->create([
        'board_id' => $full->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
        'position' => 1,
    ]);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'placements_count', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('boards.0.name', 'Empty')
            ->where('boards.1.name', 'Full')
        );
});

test('sort by client_name and project_name order boards', function () {
    $owner = User::factory()->create();
    [, $zProj] = trackingBoardsClientProject('Zeta Co', 'PZ');
    [, $aProj] = trackingBoardsClientProject('Alpha Co', 'PA');

    trackingBoard($zProj, $owner, ['name' => 'Z']);
    trackingBoard($aProj, $owner, ['name' => 'A']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'client_name', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page->where('boards.0.name', 'A'));

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'project_name', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page->where('boards.0.name', 'A'));
});

test('invalid sort_by is rejected', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['sort_by' => 'banana']))
        ->assertSessionHasErrors('sort_by');
});

// ─── Pagination ──────────────────────────────────────────────────────────────

test('pagination returns 15 per page and exposes metadata', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    foreach (range(1, 16) as $n) {
        trackingBoard($project, $owner, ['name' => sprintf('Board %02d', $n)]);
    }

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('boards', 15)
            ->where('pagination.current_page', 1)
            ->where('pagination.last_page', 2)
            ->where('pagination.per_page', 15)
            ->where('pagination.total', 16)
        );

    $this->actingAs($owner)
        ->get(route('tracking.boards.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->has('boards', 1));
});

// ─── Serialization ───────────────────────────────────────────────────────────

test('board row exposes expected serialized shape', function () {
    $owner = User::factory()->create();
    [$client, $project] = trackingBoardsClientProject('SerClient', 'SerProject');
    $creator = User::factory()->create(['name' => 'Alice']);

    $board = trackingBoard($project, $creator, ['name' => 'Planning']);
    trackingBoardColumn($board, 'Todo');
    trackingBoardColumn($board, 'Done', 2);

    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'I',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $owner->id,
    ]);
    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $board->columns()->first()->id,
        'position' => 1,
    ]);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('boards.0.id', $board->id)
            ->where('boards.0.name', 'Planning')
            ->where('boards.0.columns_count', 2)
            ->where('boards.0.placements_count', 1)
            ->where('boards.0.creator.id', $creator->id)
            ->where('boards.0.creator.name', 'Alice')
            ->where('boards.0.project.id', $project->id)
            ->where('boards.0.project.name', 'SerProject')
            ->where('boards.0.client.id', $client->id)
            ->where('boards.0.client.name', 'SerClient')
            ->where('boards.0.show_url', "/clients/{$client->id}/projects/{$project->id}/boards/{$board->id}")
            ->where('boards.0.edit_url', "/clients/{$client->id}/boards/{$board->id}/edit")
            ->where('boards.0.can_manage', true)
        );
});

test('board with null creator serializes creator as null', function () {
    $owner = User::factory()->create();
    [, $project] = trackingBoardsClientProject();

    trackingBoard($project, null, ['name' => 'Orphan']);

    $this->actingAs($owner)
        ->get(route('tracking.boards.index'))
        ->assertInertia(fn (Assert $page) => $page->where('boards.0.creator', null));
});

// ─── N+1 guard ───────────────────────────────────────────────────────────────

test('boards index executes a bounded number of queries for a realistic dataset', function () {
    $owner = User::factory()->create();

    foreach (range(1, 3) as $i) {
        [, $project] = trackingBoardsClientProject("C{$i}", "P{$i}");
        foreach (range(1, 5) as $n) {
            $creator = User::factory()->create();
            $board = trackingBoard($project, $creator, ['name' => "{$project->name}-{$n}"]);
            trackingBoardColumn($board, 'Todo');
        }
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->actingAs($owner)->get(route('tracking.boards.index'))->assertOk();

    $count = count(DB::getQueryLog());
    DB::disableQueryLog();

    // Ceiling guards against N+1 regressions; includes filter-option queries.
    expect($count)->toBeLessThanOrEqual(25);
});

// ─── Bulk delete endpoint ────────────────────────────────────────────────────

test('platform owner can bulk delete boards across projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingBoardsClientProject('A');
    [, $projectB] = trackingBoardsClientProject('B');

    $b1 = trackingBoard($projectA, $owner, ['name' => 'A1']);
    $b2 = trackingBoard($projectB, $owner, ['name' => 'B1']);
    $keep = trackingBoard($projectA, $owner, ['name' => 'Keep']);

    $this->actingAs($owner)
        ->delete(route('tracking.boards.bulkDelete'), [
            'board_ids' => [$b1->id, $b2->id],
        ])
        ->assertRedirect();

    expect(Board::query()->whereKey([$b1->id, $b2->id])->count())->toBe(0);
    expect(Board::query()->whereKey($keep->id)->exists())->toBeTrue();
});

test('non-platform-owner is forbidden from bulk delete boards', function () {
    [$client] = trackingBoardsClientProject();
    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->delete(route('tracking.boards.bulkDelete'), ['board_ids' => [1]])
        ->assertForbidden();
});
