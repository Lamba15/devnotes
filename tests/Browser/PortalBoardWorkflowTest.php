<?php

use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ClientMembershipPermission;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

function grantClientPermissions(ClientMembership $membership, array $permissions): void
{
    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
        ClientMembershipPermission::query()->create([
            'client_membership_id' => $membership->id,
            'permission_name' => $permission,
        ]);
    }
}

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

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantClientPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $project, $board, $column, $issue) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitFor('[data-testid="backlog-toggle"]', 20)
            ->assertMissing('[data-testid="backlog-drawer"]')
            ->assertDontSee('Portal issue')
            ->assertSeeIn('[data-testid="backlog-toggle"]', 'Backlog')
            ->assertSeeIn('[data-testid="backlog-toggle"]', '1')
            ->click('[data-testid="backlog-toggle"]')
            ->waitFor('[data-testid="backlog-drawer"]', 20)
            ->waitForText('Portal issue', 20)
            ->drag(
                '[data-testid="issue-drag-handle-'.$issue->id.'"]',
                '[data-testid="board-dropzone-'.$column->id.'"]',
            )
            ->waitForTextIn('[data-testid="backlog-toggle"]', '0', 20)
            ->waitForText('No backlog issues', 20)
            ->assertPresent('[data-testid="board-issue-'.$issue->id.'"]');
    });

    $this->assertDatabaseHas('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
    ]);

    expect($issue->fresh()->status)->toBe('in_progress');
});

test('member can move an issue back into backlog through the drawer', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Return Client',
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Return Project',
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Return Board',
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
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Return issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $member->id,
    ]);

    BoardIssuePlacement::query()->create([
        'board_id' => $board->id,
        'issue_id' => $issue->id,
        'column_id' => $column->id,
        'position' => 1,
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantClientPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $project, $board, $issue) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitForText('Return issue', 20)
            ->assertSeeIn('[data-testid="backlog-toggle"]', '0')
            ->click('[data-testid="backlog-toggle"]')
            ->waitFor('[data-testid="backlog-drawer"]', 20)
            ->drag(
                '[data-testid="issue-drag-handle-'.$issue->id.'"]',
                '[data-testid="backlog-dropzone"]',
            )
            ->waitForTextIn('[data-testid="backlog-toggle"]', '1', 20)
            ->waitForText('Return issue', 20);
    });

    $this->assertDatabaseMissing('board_issue_placements', [
        'board_id' => $board->id,
        'issue_id' => $issue->id,
    ]);
});

test('viewer can open backlog but cannot move issues', function () {
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

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'viewer',
    ]);
    grantClientPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $viewer->id,
    ]);

    $this->browse(function (Browser $browser) use ($viewer, $client, $project, $board) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($viewer)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitFor('[data-testid="backlog-toggle"]', 20)
            ->assertMissing('[data-testid="backlog-drawer"]')
            ->assertDontSee('Viewer issue')
            ->click('[data-testid="backlog-toggle"]')
            ->waitFor('[data-testid="backlog-drawer"]', 20)
            ->waitForText('Viewer issue', 20)
            ->assertMissing('[aria-label="Move Viewer issue"]');
    });
});

test('board quick view shows issue created timestamp in the saved user timezone', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'name' => 'Timezone Board Client',
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Timezone Board Project',
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Timezone Board',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
        'timezone' => 'Asia/Tokyo',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Timezone board issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $member->id,
    ]);
    $otherIssue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Another backlog issue',
        'status' => 'done',
        'priority' => 'low',
        'type' => 'bug',
        'creator_id' => $member->id,
    ]);

    $issueTimestamp = CarbonImmutable::parse('2026-03-12 12:35:00', 'UTC');
    $otherTimestamp = CarbonImmutable::parse('2026-03-10 08:15:00', 'UTC');

    Issue::query()->whereKey($issue->id)->update([
        'created_at' => $issueTimestamp,
        'updated_at' => $issueTimestamp,
    ]);
    Issue::query()->whereKey($otherIssue->id)->update([
        'created_at' => $otherTimestamp,
        'updated_at' => $otherTimestamp,
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantClientPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $project, $board, $issue) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit('/overview')
            ->waitForText($client->name, 20)
            ->visit(route('clients.projects.boards.show', [$client, $project, $board], false))
            ->waitFor('[data-testid="backlog-toggle"]', 20)
            ->click('[data-testid="backlog-toggle"]')
            ->waitForText('Timezone board issue', 20)
            ->assertPresent('[data-testid="backlog-filter"]')
            ->assertPresent('[data-testid="backlog-sort"]')
            ->assertSee('12 Mar 2026')
            ->type('[data-testid="backlog-filter"]', 'Timezone board issue')
            ->pause(250)
            ->assertSee('Timezone board issue')
            ->assertDontSee('Another backlog issue')
            ->click('[data-testid="board-issue-'.$issue->id.'"] button[type="button"]')
            ->waitForText('Open full issue', 20)
            ->assertSee('Created')
            ->assertSee('12 MAR 2026, 21:35');
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

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantClientPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_READ,
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
