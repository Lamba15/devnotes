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
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

test('member with board access can move an issue through the board UI', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Portal Client',
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Portal Project',
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Portal Board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => true,
        'mapped_status' => 'in_progress',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Portal issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $member->id,
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

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $project, $board) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitForText('Portal issue', 20)
            ->press('Move to Doing')
            ->waitForText('No backlog issues.', 20)
            ->assertSee('in_progress / medium / task');
    });

    $this->assertDatabaseHas('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
    ]);

    expect($issue->fresh()->status)->toBe('in_progress');
});

test('viewer can see a board but cannot move issues', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Viewer Client',
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Viewer Project',
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Viewer Board',
    ]);
    BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => false,
    ]);
    $viewer = User::factory()->create([
        'password' => 'password',
    ]);

    Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Viewer issue',
        'status' => 'todo',
        'priority' => 'low',
        'type' => 'task',
        'creator_id' => $viewer->id,
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    $this->browse(function (Browser $browser) use ($viewer, $client, $project, $board) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($viewer)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitForText('Viewer issue', 20)
            ->assertDontSee('Move to Doing')
            ->assertSee('todo / low / task');
    });
});

test('member can discover boards and read board context through the assistant', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Assistant Board Client',
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Assistant Board Project',
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Assistant Insight Board',
    ]);
    $column = BoardColumn::query()->create([
        'board_id' => $board->id,
        'name' => 'Doing',
        'position' => 1,
        'updates_status' => false,
    ]);
    $member = User::factory()->create([
        'password' => 'password',
    ]);

    $backlogIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Assistant backlog issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $member->id,
    ]);

    $placedIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Assistant placed issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'bug',
        'creator_id' => $member->id,
    ]);

    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $placedIssue->id,
        'column_id' => $column->id,
        'position' => 1,
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

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $board) {
        $listPrompt = json_encode('List my boards', JSON_THROW_ON_ERROR);
        $contextPrompt = json_encode("Show board context for board {$board->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.show', $client, false).'#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']")
            ->waitFor("button[data-testid='assistant-send']");

        $browser->script(
            "const textarea = document.querySelector(\"textarea[name='assistant_message']\");".
            "const value = {$listPrompt};".
            'const previousValue = textarea.value;'.
            "const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;".
            'setter.call(textarea, value);'.
            'const tracker = textarea._valueTracker;'.
            'if (tracker) { tracker.setValue(previousValue); }'.
            "textarea.dispatchEvent(new Event('input', { bubbles: true }));".
            "textarea.dispatchEvent(new Event('change', { bubbles: true }));"
        );

        $browser->click("button[data-testid='assistant-send']")
            ->waitForText('Accessible boards', 60)
            ->assertSee('Assistant Insight Board')
            ->assertSee('Assistant Board Client')
            ->assertSee('Assistant Board Project');

        $browser->script(
            "const textarea = document.querySelector(\"textarea[name='assistant_message']\");".
            "const value = {$contextPrompt};".
            'const previousValue = textarea.value;'.
            "const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;".
            'setter.call(textarea, value);'.
            'const tracker = textarea._valueTracker;'.
            'if (tracker) { tracker.setValue(previousValue); }'.
            "textarea.dispatchEvent(new Event('input', { bubbles: true }));".
            "textarea.dispatchEvent(new Event('change', { bubbles: true }));"
        );

        $browser->click("button[data-testid='assistant-send']")
            ->waitForText('Board context', 60)
            ->assertSee('Assistant backlog issue')
            ->assertSee('Assistant placed issue')
            ->assertSee('Doing');
    });

    expect($backlogIssue->fresh()->title)->toBe('Assistant backlog issue');
});
