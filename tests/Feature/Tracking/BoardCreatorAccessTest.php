<?php

use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ClientMembershipPermission;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function grantPermissions(ClientMembership $membership, array $permissions): void
{
    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
        ClientMembershipPermission::query()->create([
            'client_membership_id' => $membership->id,
            'permission_name' => $permission,
        ]);
    }
}

test('board creator can view their board without explicit board membership', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    // Member creates a board through the store endpoint
    $this->actingAs($member)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'My created board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'My created board')->firstOrFail();

    // No explicit board membership exists
    $this->assertDatabaseMissing('board_memberships', [
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    // Creator can still view the board
    $this->actingAs($member)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('boards/show')
            ->where('board.id', $board->id)
        );
});

test('board creator can manage their board without explicit board membership', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Creator managed board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Creator managed board')->firstOrFail();

    // Creator can edit the board
    $this->actingAs($member)
        ->get(route('clients.boards.edit', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('boards/edit'));

    // Creator can update the board
    $this->actingAs($member)
        ->put(route('clients.boards.update', [$client, $board]), [
            'name' => 'Updated by creator',
            'project_id' => $project->id,
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    expect($board->fresh()->name)->toBe('Updated by creator');

    // Creator can delete the board
    $this->actingAs($member)
        ->delete(route('clients.boards.destroy', [$client, $board]))
        ->assertRedirect(route('clients.boards.index', $client));

    $this->assertDatabaseMissing('boards', ['id' => $board->id]);
});

test('board creator sees their board in the boards index without explicit board membership', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Visible in index',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Visible in index')->firstOrFail();

    $this->actingAs($member)
        ->get(route('clients.boards.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/boards')
            ->has('boards', 1)
            ->where('boards.0.name', 'Visible in index')
            ->where('boards.0.id', $board->id)
        );
});

test('board creator can manage board members without projects.write permission', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $creator = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $creator->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $creator->id,
    ]);

    $this->actingAs($creator)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Creator invite board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Creator invite board')->firstOrFail();

    $otherMember = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $otherMember->id,
        'role' => 'member',
    ]);

    // Creator can visit the add member page
    $this->actingAs($creator)
        ->get(route('clients.boards.members.create', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('boards/members/create'));

    // Creator can add members to their board
    $this->actingAs($creator)
        ->post(route('clients.boards.members.store', [$client, $board]), [
            'user_id' => $otherMember->id,
        ])
        ->assertRedirect(route('clients.boards.members.index', [$client, $board]));

    $this->assertDatabaseHas('board_memberships', [
        'board_id' => $board->id,
        'user_id' => $otherMember->id,
    ]);

    // Creator can remove members from their board
    $boardMembership = BoardMembership::query()
        ->where('board_id', $board->id)
        ->where('user_id', $otherMember->id)
        ->firstOrFail();

    $this->actingAs($creator)
        ->delete(route('clients.boards.members.destroy', [$client, $board, $boardMembership]))
        ->assertRedirect(route('clients.boards.members.index', [$client, $board]));

    $this->assertDatabaseMissing('board_memberships', [
        'board_id' => $board->id,
        'user_id' => $otherMember->id,
    ]);
});

test('board creator still needs project membership to access their board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Orphaned board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Orphaned board')->firstOrFail();

    // Remove project membership
    ProjectMembership::query()
        ->where('project_id', $project->id)
        ->where('user_id', $member->id)
        ->delete();

    // Creator cannot access without project membership
    $this->actingAs($member)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertForbidden();
});

test('board creator still needs boards permission to access their board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::BOARDS_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Permission revoked board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Permission revoked board')->firstOrFail();

    // Remove boards permissions
    ClientMembershipPermission::query()
        ->where('client_membership_id', $membership->id)
        ->whereIn('permission_name', [
            ClientPermissionCatalog::BOARDS_READ,
            ClientPermissionCatalog::BOARDS_WRITE,
        ])
        ->delete();

    // Creator cannot access without boards permission
    $this->actingAs($member)
        ->get(route('clients.projects.boards.show', [$client, $project, $board]))
        ->assertForbidden();
});

test('created_by is recorded when a board is created', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->post(route('clients.boards.store', $client), [
            'project_id' => $project->id,
            'name' => 'Tracked creator board',
            'columns' => [],
        ])
        ->assertRedirect(route('clients.boards.index', $client));

    $board = Board::query()->where('name', 'Tracked creator board')->firstOrFail();

    expect($board->created_by)->toBe($admin->id);
});
