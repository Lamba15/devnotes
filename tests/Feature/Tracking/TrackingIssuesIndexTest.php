<?php

use App\Models\Attachment;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function trackingClientProject(string $clientName = 'Client', string $projectName = 'Project'): array
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

function trackingIssue(Project $project, User $creator, array $overrides = []): Issue
{
    $assigneeId = $overrides['assignee_id'] ?? null;
    $assigneeIds = $overrides['assignee_ids'] ?? null;
    unset($overrides['assignee_id'], $overrides['assignee_ids']);

    $issue = Issue::query()->create(array_merge([
        'project_id' => $project->id,
        'title' => 'Issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $creator->id,
    ], $overrides));

    if ($assigneeIds !== null) {
        $issue->assignees()->sync($assigneeIds);
    } elseif ($assigneeId !== null) {
        $issue->assignees()->sync([$assigneeId]);
    }

    return $issue;
}

test('unauthenticated users are redirected from tracking issues to login', function () {
    $this->get(route('tracking.issues.index'))->assertRedirect(route('login'));
});

test('client-scoped users cannot visit tracking issues', function () {
    [$client] = trackingClientProject();
    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->get(route('tracking.issues.index'))
        ->assertForbidden();
});

test('platform owners can visit tracking issues', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('tracking/issues'));
});

test('tracking issues page exposes expected prop keys', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('tracking/issues')
            ->has('issues')
            ->has('pagination')
            ->has('filters')
            ->has('client_filter_options')
            ->has('project_filter_options')
            ->has('status_filter_options')
            ->has('priority_filter_options')
            ->has('type_filter_options')
            ->has('assignee_filter_options')
            ->has('creator_filter_options')
            ->has('label_filter_options')
        );
});

test('tracking issues page lists issues across all clients and projects', function () {
    $owner = User::factory()->create();
    [$clientA, $projectA] = trackingClientProject('Alpha Client', 'Alpha Project');
    [$clientB, $projectB] = trackingClientProject('Bravo Client', 'Bravo Project');

    trackingIssue($projectA, $owner, ['title' => 'Alpha One']);
    trackingIssue($projectA, $owner, ['title' => 'Alpha Two']);
    trackingIssue($projectB, $owner, ['title' => 'Bravo One']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('tracking/issues')
            ->has('issues', 3)
        );
});

// ─── Search ──────────────────────────────────────────────────────────────────

test('search matches issue title', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'Investigate caching']);
    trackingIssue($project, $owner, ['title' => 'Fix login form']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['search' => 'cach']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Investigate caching')
        );
});

test('search matches issue description', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'A', 'description' => 'redis keys expire']);
    trackingIssue($project, $owner, ['title' => 'B', 'description' => 'postgres tuning']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['search' => 'redis']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'A')
        );
});

test('search matches assignee name', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $zelda = User::factory()->create(['name' => 'Zelda Fitzgerald']);

    trackingIssue($project, $owner, ['title' => 'Assigned', 'assignee_id' => $zelda->id]);
    trackingIssue($project, $owner, ['title' => 'Unassigned']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['search' => 'zelda']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Assigned')
        );
});

test('search matches project and client names', function () {
    $owner = User::factory()->create();
    [, $alphaProject] = trackingClientProject('Acme Corp', 'Apollo');
    [, $bravoProject] = trackingClientProject('Beta Inc', 'Bullseye');

    trackingIssue($alphaProject, $owner, ['title' => 'Alpha task']);
    trackingIssue($bravoProject, $owner, ['title' => 'Bravo task']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['search' => 'acme']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Alpha task')
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['search' => 'bullseye']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Bravo task')
        );
});

// ─── Multi-select filters ────────────────────────────────────────────────────

test('status filter narrows to passed statuses', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'T', 'status' => 'todo']);
    trackingIssue($project, $owner, ['title' => 'P', 'status' => 'in_progress']);
    trackingIssue($project, $owner, ['title' => 'D', 'status' => 'done']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['status' => ['todo', 'in_progress']]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 2)
        );
});

test('priority filter narrows results', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'L', 'priority' => 'low']);
    trackingIssue($project, $owner, ['title' => 'H', 'priority' => 'high']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['priority' => ['high']]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'H')
        );
});

test('type filter narrows results', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'T', 'type' => 'task']);
    trackingIssue($project, $owner, ['title' => 'B', 'type' => 'bug']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['type' => ['bug']]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'B')
        );
});

test('label filter narrows to matching labels', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'A', 'label' => 'backend']);
    trackingIssue($project, $owner, ['title' => 'B', 'label' => 'frontend']);
    trackingIssue($project, $owner, ['title' => 'C']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['label' => ['backend']]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'A')
        );
});

test('assignee filter supports unassigned sentinel', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create(['name' => 'Alice']);

    trackingIssue($project, $owner, ['title' => 'Assigned', 'assignee_id' => $alice->id]);
    trackingIssue($project, $owner, ['title' => 'Unassigned']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['assignee' => ['unassigned']]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Unassigned')
        );
});

test('assignee filter supports specific user ids', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    trackingIssue($project, $owner, ['title' => 'Alice', 'assignee_id' => $alice->id]);
    trackingIssue($project, $owner, ['title' => 'Bob', 'assignee_id' => $bob->id]);
    trackingIssue($project, $owner, ['title' => 'None']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['assignee' => [(string) $alice->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Alice')
        );
});

test('assignee filter combines user id with unassigned sentinel', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create();

    trackingIssue($project, $owner, ['title' => 'Alice', 'assignee_id' => $alice->id]);
    trackingIssue($project, $owner, ['title' => 'None']);
    trackingIssue($project, $owner, ['title' => 'Other', 'assignee_id' => User::factory()->create()->id]);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['assignee' => [(string) $alice->id, 'unassigned']]))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 2));
});

test('creator filter narrows to issues created by selected users', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create();
    $bob = User::factory()->create();

    trackingIssue($project, $alice, ['title' => 'Alice made']);
    trackingIssue($project, $bob, ['title' => 'Bob made']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['creator_id' => [(string) $alice->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Alice made')
        );
});

test('client filter scopes to issues in selected clients projects', function () {
    $owner = User::factory()->create();
    [$clientA, $projectA] = trackingClientProject('A');
    [, $projectB] = trackingClientProject('B');

    trackingIssue($projectA, $owner, ['title' => 'A-only']);
    trackingIssue($projectB, $owner, ['title' => 'B-only']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['client_id' => [(string) $clientA->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'A-only')
        );
});

test('project filter scopes to selected projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingClientProject('C', 'ProjA');
    [, $projectB] = trackingClientProject('C2', 'ProjB');

    trackingIssue($projectA, $owner, ['title' => 'A']);
    trackingIssue($projectB, $owner, ['title' => 'B']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['project_id' => [(string) $projectA->id]]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'A')
        );
});

test('client and project filters combine with AND semantics', function () {
    $owner = User::factory()->create();
    [$clientA, $projectA] = trackingClientProject('A');
    [, $projectB] = trackingClientProject('B');

    trackingIssue($projectA, $owner, ['title' => 'A match']);
    trackingIssue($projectB, $owner, ['title' => 'B']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', [
            'client_id' => [(string) $clientA->id],
            'project_id' => [(string) $projectA->id],
        ]))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 1)->where('issues.0.title', 'A match'));

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', [
            'client_id' => [(string) $clientA->id],
            'project_id' => [(string) $projectB->id],
        ]))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 0));
});

// ─── Date-range filters ──────────────────────────────────────────────────────

test('due_date filters bound returned issues', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'Past', 'due_date' => '2026-01-01']);
    trackingIssue($project, $owner, ['title' => 'Mid', 'due_date' => '2026-02-15']);
    trackingIssue($project, $owner, ['title' => 'Future', 'due_date' => '2026-06-01']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['due_date_from' => '2026-02-01', 'due_date_to' => '2026-03-01']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Mid')
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['due_date_from' => '2026-04-01']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Future')
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['due_date_to' => '2026-01-15']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Past')
        );
});

test('created date range filters bound returned issues', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    $old = trackingIssue($project, $owner, ['title' => 'Old']);
    $old->created_at = '2026-01-01 10:00:00';
    $old->save();

    $mid = trackingIssue($project, $owner, ['title' => 'Mid']);
    $mid->created_at = '2026-03-15 12:00:00';
    $mid->save();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['created_from' => '2026-03-01']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Mid')
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['created_to' => '2026-01-15']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.title', 'Old')
        );
});

// ─── Boolean toggles ─────────────────────────────────────────────────────────

test('has_attachments filter returns issues with or without attachments', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    $withAtt = trackingIssue($project, $owner, ['title' => 'With']);
    Attachment::query()->create([
        'attachable_type' => Issue::class,
        'attachable_id' => $withAtt->id,
        'uploaded_by' => $owner->id,
        'file_name' => 'f.txt',
        'file_path' => 'x/f.txt',
        'mime_type' => 'text/plain',
        'file_size' => 4,
    ]);
    trackingIssue($project, $owner, ['title' => 'Without']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['has_attachments' => 'yes']))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 1)->where('issues.0.title', 'With'));

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['has_attachments' => 'no']))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 1)->where('issues.0.title', 'Without'));
});

test('has_comments filter returns issues with or without comments', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    $withC = trackingIssue($project, $owner, ['title' => 'With']);
    IssueComment::query()->create([
        'issue_id' => $withC->id,
        'user_id' => $owner->id,
        'body' => 'hello',
    ]);
    trackingIssue($project, $owner, ['title' => 'Without']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['has_comments' => 'yes']))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 1)->where('issues.0.title', 'With'));
});

// ─── Sorting ─────────────────────────────────────────────────────────────────

test('sort by title ascending and descending orders results', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'Charlie']);
    trackingIssue($project, $owner, ['title' => 'Alpha']);
    trackingIssue($project, $owner, ['title' => 'Bravo']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['sort_by' => 'title', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('issues.0.title', 'Alpha')
            ->where('issues.1.title', 'Bravo')
            ->where('issues.2.title', 'Charlie')
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['sort_by' => 'title', 'sort_direction' => 'desc']))
        ->assertInertia(fn (Assert $page) => $page->where('issues.0.title', 'Charlie'));
});

test('sort by client_name orders across projects', function () {
    $owner = User::factory()->create();
    [, $projectZ] = trackingClientProject('Zeta Co', 'P1');
    [, $projectA] = trackingClientProject('Alpha Co', 'P2');

    trackingIssue($projectZ, $owner, ['title' => 'Z']);
    trackingIssue($projectA, $owner, ['title' => 'A']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['sort_by' => 'client_name', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page->where('issues.0.title', 'A'));
});

test('sort by project_name orders results', function () {
    $owner = User::factory()->create();
    [, $projB] = trackingClientProject('C1', 'Beta');
    [, $projA] = trackingClientProject('C2', 'Alpha');

    trackingIssue($projB, $owner, ['title' => 'B']);
    trackingIssue($projA, $owner, ['title' => 'A']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['sort_by' => 'project_name', 'sort_direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page->where('issues.0.title', 'A'));
});

test('invalid sort_by is rejected by validation', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['sort_by' => 'banana']))
        ->assertSessionHasErrors('sort_by');
});

// ─── Pagination ──────────────────────────────────────────────────────────────

test('pagination returns 15 per page and exposes metadata', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    foreach (range(1, 16) as $n) {
        trackingIssue($project, $owner, ['title' => sprintf('Issue %02d', $n)]);
    }

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 15)
            ->where('pagination.current_page', 1)
            ->where('pagination.last_page', 2)
            ->where('pagination.per_page', 15)
            ->where('pagination.total', 16)
        );

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->has('issues', 1));
});

test('pagination preserves filter query string', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    foreach (range(1, 16) as $n) {
        trackingIssue($project, $owner, ['title' => "Todo {$n}", 'status' => 'todo']);
    }
    trackingIssue($project, $owner, ['title' => 'Done', 'status' => 'done']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['status' => ['todo'], 'page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filters.status.0', 'todo')
            ->has('issues', 1)
        );
});

// ─── Validation ──────────────────────────────────────────────────────────────

test('invalid date format returns a session error', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['due_date_from' => 'not-a-date']))
        ->assertSessionHasErrors('due_date_from');
});

test('non-existent project id returns empty result, not 500', function () {
    $owner = User::factory()->create();

    $this->actingAs($owner)
        ->get(route('tracking.issues.index', ['project_id' => ['999999']]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('issues', 0));
});

// ─── Serialization ───────────────────────────────────────────────────────────

test('issue row exposes expected serialized shape', function () {
    $owner = User::factory()->create();
    [$client, $project] = trackingClientProject('SerClient', 'SerProject');
    $assignee = User::factory()->create(['name' => 'Alice']);

    $issue = trackingIssue($project, $owner, [
        'title' => 'Shape Test',
        'description' => 'a description',
        'status' => 'in_progress',
        'priority' => 'high',
        'type' => 'bug',
        'label' => 'backend',
        'due_date' => '2026-05-01',
        'assignee_id' => $assignee->id,
    ]);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('issues', 1)
            ->where('issues.0.id', $issue->id)
            ->where('issues.0.title', 'Shape Test')
            ->where('issues.0.status', 'in_progress')
            ->where('issues.0.priority', 'high')
            ->where('issues.0.type', 'bug')
            ->where('issues.0.label', 'backend')
            ->where('issues.0.due_date', '2026-05-01')
            ->where('issues.0.comments_count', 0)
            ->where('issues.0.attachments_count', 0)
            ->has('issues.0.assignees', 1)
            ->where('issues.0.assignees.0.id', $assignee->id)
            ->where('issues.0.assignees.0.name', 'Alice')
            ->where('issues.0.creator.id', $owner->id)
            ->where('issues.0.project.id', $project->id)
            ->where('issues.0.project.name', 'SerProject')
            ->where('issues.0.client.id', $client->id)
            ->where('issues.0.client.name', 'SerClient')
            ->where('issues.0.show_url', "/clients/{$client->id}/projects/{$project->id}/issues/{$issue->id}")
            ->where('issues.0.edit_url', "/clients/{$client->id}/projects/{$project->id}/issues/{$issue->id}/edit")
            ->where('issues.0.can_manage', true)
        );
});

test('unassigned issue serializes assignees as empty array', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();

    trackingIssue($project, $owner, ['title' => 'None']);

    $this->actingAs($owner)
        ->get(route('tracking.issues.index'))
        ->assertInertia(fn (Assert $page) => $page->where('issues.0.assignees', []));
});

// ─── N+1 guard ───────────────────────────────────────────────────────────────

test('issues index executes a bounded number of queries for a realistic dataset', function () {
    $owner = User::factory()->create();
    $clients = collect(range(1, 3))->map(fn ($i) => trackingClientProject("C{$i}", "P{$i}"));

    foreach ($clients as [$client, $project]) {
        foreach (range(1, 5) as $n) {
            trackingIssue($project, $owner, [
                'title' => "{$client->name} issue {$n}",
                'assignee_id' => User::factory()->create()->id,
            ]);
        }
    }

    DB::flushQueryLog();
    DB::enableQueryLog();

    $this->actingAs($owner)->get(route('tracking.issues.index'))->assertOk();

    $log = DB::getQueryLog();
    DB::disableQueryLog();

    // Ceiling accounts for: auth, session, paginator count, main page, eager loads
    // (project, client, assignees pivot, creator, comments, attachments), counts,
    // and filter-option queries (including pivot GROUP BY for assignees).
    // Raise with caution — this test guards against accidental N+1 regressions.
    expect(count($log))->toBeLessThanOrEqual(40);
});

// ─── Bulk update endpoint ────────────────────────────────────────────────────

test('platform owner can bulk update status across projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingClientProject('A');
    [, $projectB] = trackingClientProject('B');

    $i1 = trackingIssue($projectA, $owner, ['title' => 'A1', 'status' => 'todo']);
    $i2 = trackingIssue($projectB, $owner, ['title' => 'B1', 'status' => 'todo']);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$i1->id, $i2->id],
            'status' => 'done',
        ])
        ->assertRedirect();

    expect($i1->fresh()->status)->toBe('done');
    expect($i2->fresh()->status)->toBe('done');
});

test('platform owner can bulk set priority', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $i = trackingIssue($project, $owner, ['title' => 'X', 'priority' => 'medium']);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$i->id],
            'priority' => 'high',
        ])
        ->assertRedirect();

    expect($i->fresh()->priority)->toBe('high');
});

test('platform owner can bulk reassign with replace semantics', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create();
    $bob = User::factory()->create();
    $charlie = User::factory()->create();

    $i = trackingIssue($project, $owner, ['title' => 'X']);
    $j = trackingIssue($project, $owner, ['title' => 'Y', 'assignee_ids' => [$charlie->id]]);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$i->id, $j->id],
            'assignee_ids' => [$alice->id, $bob->id],
        ])
        ->assertRedirect();

    expect($i->fresh()->assignees()->pluck('users.id')->sort()->values()->all())
        ->toEqual([$alice->id, $bob->id]);
    expect($j->fresh()->assignees()->pluck('users.id')->sort()->values()->all())
        ->toEqual([$alice->id, $bob->id]);
});

test('platform owner can bulk unassign with empty array', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $alice = User::factory()->create();

    $j = trackingIssue($project, $owner, ['title' => 'Y', 'assignee_ids' => [$alice->id]]);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$j->id],
            'assignee_ids' => [],
        ])
        ->assertRedirect();

    expect($j->fresh()->assignees)->toHaveCount(0);
});

test('bulk update ignores unknown fields like title', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $i = trackingIssue($project, $owner, ['title' => 'Original']);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$i->id],
            'status' => 'done',
            'title' => 'Bypass',
        ])
        ->assertRedirect();

    expect($i->fresh()->title)->toBe('Original');
    expect($i->fresh()->status)->toBe('done');
});

test('bulk update requires at least one mutation field', function () {
    $owner = User::factory()->create();
    [, $project] = trackingClientProject();
    $i = trackingIssue($project, $owner, ['title' => 'X']);

    $this->actingAs($owner)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [$i->id],
        ])
        ->assertSessionHasErrors();
});

test('non-platform-owner is forbidden from bulk update', function () {
    [$client] = trackingClientProject();
    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->post(route('tracking.issues.bulkUpdate'), [
            'issue_ids' => [1],
            'status' => 'done',
        ])
        ->assertForbidden();
});

// ─── Bulk delete endpoint ────────────────────────────────────────────────────

test('platform owner can bulk delete issues across projects', function () {
    $owner = User::factory()->create();
    [, $projectA] = trackingClientProject('A');
    [, $projectB] = trackingClientProject('B');

    $i1 = trackingIssue($projectA, $owner, ['title' => 'A1']);
    $i2 = trackingIssue($projectB, $owner, ['title' => 'B1']);
    $survivor = trackingIssue($projectA, $owner, ['title' => 'Keep']);

    $this->actingAs($owner)
        ->delete(route('tracking.issues.bulkDelete'), [
            'issue_ids' => [$i1->id, $i2->id],
        ])
        ->assertRedirect();

    expect(Issue::query()->whereKey([$i1->id, $i2->id])->count())->toBe(0);
    expect(Issue::query()->whereKey($survivor->id)->exists())->toBeTrue();
});

test('non-platform-owner is forbidden from bulk delete', function () {
    [$client] = trackingClientProject();
    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'admin',
    ]);

    $this->actingAs($member)
        ->delete(route('tracking.issues.bulkDelete'), ['issue_ids' => [1]])
        ->assertForbidden();
});
