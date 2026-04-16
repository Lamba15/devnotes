<?php

use App\Actions\Boards\CreateBoardMembership;
use App\Actions\Boards\DeleteBoardMembership;
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
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

// --- Action Tests ---

test('managers can add a board membership and it is audited', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Team board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $action = app(CreateBoardMembership::class);
    $membership = $action->handle($admin, $board, $member->id);

    expect($membership)->toBeInstanceOf(BoardMembership::class);
    $this->assertDatabaseHas('board_memberships', [
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.member.added',
        'source' => 'manual_ui',
        'subject_type' => BoardMembership::class,
        'subject_id' => $membership->id,
    ]);
});

test('non-managers cannot add a board membership', function () {
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

    $otherMember = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $otherMember->id,
        'role' => 'member',
    ]);

    $action = app(CreateBoardMembership::class);
    $action->handle($member, $board, $otherMember->id);
})->throws(AuthorizationException::class);

test('duplicate board membership is rejected', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Dup board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $action = app(CreateBoardMembership::class);
    $action->handle($admin, $board, $member->id);
})->throws(ValidationException::class);

test('cannot add a user who does not belong to the client', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Client board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $outsider = User::factory()->create();

    $action = app(CreateBoardMembership::class);
    $action->handle($admin, $board, $outsider->id);
})->throws(ValidationException::class);

test('managers can remove a board membership and it is audited', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Remove board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create();
    $membership = BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $action = app(DeleteBoardMembership::class);
    $action->handle($admin, $membership);

    $this->assertDatabaseMissing('board_memberships', [
        'id' => $membership->id,
    ]);
    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'board.member.removed',
        'source' => 'manual_ui',
        'subject_type' => BoardMembership::class,
        'subject_id' => $membership->id,
    ]);
});

test('non-managers cannot remove a board membership', function () {
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
    $boardMembership = BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $otherMember = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $otherMember->id,
        'role' => 'member',
    ]);
    $otherBoardMembership = BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $otherMember->id,
    ]);

    $action = app(DeleteBoardMembership::class);
    $action->handle($member, $otherBoardMembership);
})->throws(AuthorizationException::class);

// --- Controller Tests ---

test('managers can visit board members index page', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Index board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create(['name' => 'Alice Member']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.boards.members.index', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('boards/members/index')
            ->where('board.id', $board->id)
            ->where('client.id', $client->id)
            ->has('memberships', 1)
            ->where('memberships.0.user.name', 'Alice Member')
            ->where('can_manage_members', true)
        );
});

test('non-managers can visit board members index in read only mode when they can access the board', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Read only board',
    ]);
    $member = User::factory()->create();
    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    foreach (ClientPermissionCatalog::normalize([ClientPermissionCatalog::BOARDS_READ]) as $perm) {
        ClientMembershipPermission::query()->create([
            'client_membership_id' => $membership->id,
            'permission_name' => $perm,
        ]);
    }
    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $otherMember = User::factory()->create(['name' => 'Board User']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $otherMember->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $otherMember->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.boards.members.index', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('boards/members/index')
            ->where('board.id', $board->id)
            ->where('can_manage_members', false)
            ->has('memberships', 2)
        );
});

test('board members index supports search and sorting', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Search board',
    ]);
    $owner = User::factory()->create();

    $alice = User::factory()->create(['name' => 'Alice Worker', 'email' => 'alice@example.com']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $alice->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $alice->id,
    ]);

    $zulu = User::factory()->create(['name' => 'Zulu Worker', 'email' => 'zulu@example.com']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $zulu->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $zulu->id,
    ]);

    $this->actingAs($owner)
        ->get(route('clients.boards.members.index', [
            $client,
            $board,
            'search' => 'Worker',
            'sort_by' => 'name',
            'sort_direction' => 'desc',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('memberships.0.user.name', 'Zulu Worker')
            ->where('memberships.1.user.name', 'Alice Worker')
            ->where('filters.search', 'Worker')
            ->where('filters.sort_by', 'name')
            ->where('filters.sort_direction', 'desc')
        );
});

test('managers can visit add member page with eligible users', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Add member board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $eligible = User::factory()->create(['name' => 'Eligible User']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $eligible->id,
        'role' => 'member',
    ]);

    $alreadyMember = User::factory()->create(['name' => 'Already Member']);
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $alreadyMember->id,
        'role' => 'member',
    ]);
    BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $alreadyMember->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.boards.members.create', [$client, $board]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('boards/members/create')
            ->where('board.id', $board->id)
            ->has('eligible_users', 2)
            ->where('eligible_users', function ($eligibleUsers) {
                $eligibleNames = collect($eligibleUsers)->pluck('name');

                return $eligibleNames->contains('Eligible User')
                    && ! $eligibleNames->contains('Already Member');
            })
        );
});

test('managers can store a board membership via the form', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Store board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);

    $this->actingAs($admin)
        ->post(route('clients.boards.members.store', [$client, $board]), [
            'user_id' => $member->id,
        ])
        ->assertRedirect(route('clients.boards.members.index', [$client, $board]));

    $this->assertDatabaseHas('board_memberships', [
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);
});

test('managers can delete a board membership', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Delete board',
    ]);
    $admin = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $member = User::factory()->create();
    $membership = BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($admin)
        ->delete(route('clients.boards.members.destroy', [$client, $board, $membership]))
        ->assertRedirect(route('clients.boards.members.index', [$client, $board]));

    $this->assertDatabaseMissing('board_memberships', [
        'id' => $membership->id,
    ]);
});

test('non-managers cannot access board member management endpoints', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $board = Board::query()->create([
        'project_id' => $project->id,
        'name' => 'Forbidden board',
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

    $target = User::factory()->create();
    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $target->id,
        'role' => 'member',
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.boards.members.create', [$client, $board]))
        ->assertForbidden();

    $this->actingAs($viewer)
        ->post(route('clients.boards.members.store', [$client, $board]), [
            'user_id' => $target->id,
        ])
        ->assertForbidden();

    $membership = BoardMembership::query()->create([
        'board_id' => $board->id,
        'user_id' => $target->id,
    ]);

    $this->actingAs($viewer)
        ->delete(route('clients.boards.members.destroy', [$client, $board, $membership]))
        ->assertForbidden();
});
