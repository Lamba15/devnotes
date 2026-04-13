<?php

use App\Models\Attachment;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function grantIssueManagementPermissions(ClientMembership $membership, array $permissions): void
{
    foreach (ClientPermissionCatalog::normalize($permissions) as $permission) {
        $membership->permissions()->create([
            'permission_name' => $permission,
        ]);
    }
}

test('project users can visit the issue index and only see issues in their project', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Tracked project',
    ]);
    $otherProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'member',
    ]);
    grantIssueManagementPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Visible issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $viewer->id,
    ]);

    Issue::query()->create([
        'project_id' => $otherProject->id,
        'title' => 'Hidden issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'bug',
        'creator_id' => User::factory()->create()->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.projects.issues.index', [$client, $project]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->where('project.name', 'Tracked project')
            ->has('issues', 1)
            ->where('issues.0.title', 'Visible issue')
            ->where('can_manage_issues', false)
        );
});

test('client issues page exposes create links for projects where the member can write issues', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $writableProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Writable Project',
    ]);
    $readOnlyProject = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Read Only Project',
    ]);
    $member = User::factory()->create();

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantIssueManagementPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $writableProject->id,
        'user_id' => $member->id,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $readOnlyProject->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.issues.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/issues')
            ->where('creatable_projects', [
                [
                    'id' => $readOnlyProject->id,
                    'name' => 'Read Only Project',
                ],
                [
                    'id' => $writableProject->id,
                    'name' => 'Writable Project',
                ],
            ])
        );
});

test('project admins can visit dedicated issue create and edit pages', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Editable issue',
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

    $this->actingAs($admin)
        ->get(route('clients.projects.issues.create', [$client, $project]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('issues/create'));

    $this->actingAs($admin)
        ->get(route('clients.projects.issues.edit', [$client, $project, $issue]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('issues/edit'));
});

test('project members with issues write can visit dedicated issue create and edit pages', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Editable member issue',
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
    foreach (ClientPermissionCatalog::normalize([
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_WRITE,
    ]) as $permission) {
        $membership->permissions()->create([
            'permission_name' => $permission,
        ]);
    }

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.issues.create', [$client, $project]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('issues/create'));

    $this->actingAs($member)
        ->get(route('clients.projects.issues.edit', [$client, $project, $issue]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('issues/edit'));
});

test('viewer cannot create issues', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
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
        ->post(route('clients.projects.issues.store', [$client, $project]), [
            'title' => 'Viewer issue',
            'status' => 'todo',
            'priority' => 'low',
            'type' => 'task',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('issues', [
        'project_id' => $project->id,
        'title' => 'Viewer issue',
    ]);
});

test('client admins can create issues and issue creation is audited', function () {
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
        ->post(route('clients.projects.issues.store', [$client, $project]), [
            'title' => 'Admin issue',
            'description' => 'Created by admin',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'due_date' => '2026-05-10',
            'estimated_hours' => '6.5',
            'label' => 'backend',
        ])
        ->assertRedirect(route('clients.projects.issues.index', [$client, $project]));

    $issue = Issue::query()->where('title', 'Admin issue')->firstOrFail();

    expect($issue->project_id)->toBe($project->id);
    expect($issue->creator_id)->toBe($admin->id);
    expect($issue->due_date?->toDateString())->toBe('2026-05-10');
    expect($issue->estimated_hours)->toBe('6.5');
    expect($issue->label)->toBe('backend');

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'issue.created',
        'source' => 'manual_ui',
        'subject_type' => Issue::class,
        'subject_id' => $issue->id,
    ]);
});

test('client admins can create an issue with image and file attachments', function () {
    Storage::fake('public');

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
        ->post(route('clients.projects.issues.store', [$client, $project]), [
            'title' => 'Issue with media',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'attachments' => [
                UploadedFile::fake()->create('preview.png', 64, 'image/png'),
                UploadedFile::fake()->create('brief.pdf', 32, 'application/pdf'),
            ],
        ])
        ->assertRedirect(route('clients.projects.issues.index', [$client, $project]));

    $issue = Issue::query()->where('title', 'Issue with media')->firstOrFail();

    expect($issue->attachments()->count())->toBe(2);

    $this->assertDatabaseHas('attachments', [
        'attachable_type' => Issue::class,
        'attachable_id' => $issue->id,
        'file_name' => 'preview.png',
    ]);

    $this->assertDatabaseHas('attachments', [
        'attachable_type' => Issue::class,
        'attachable_id' => $issue->id,
        'file_name' => 'brief.pdf',
    ]);
});

test('issue attachment endpoint requires issue management permission', function () {
    Storage::fake('public');

    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Locked issue',
        'status' => 'todo',
        'priority' => 'medium',
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
        ->post(route('attachments.store'), [
            'attachable_type' => 'issue',
            'attachable_id' => $issue->id,
            'file' => UploadedFile::fake()->create('blocked.png', 32, 'image/png'),
        ])
        ->assertForbidden();

    expect(Attachment::query()->count())->toBe(0);
});

test('issue create and edit pages expose project assignee options', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create(['name' => 'Admin User']);
    $member = User::factory()->create(['name' => 'Member User']);
    $outsider = User::factory()->create(['name' => 'Outside User']);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Assigned issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'assignee_id' => $member->id,
        'creator_id' => $admin->id,
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
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

    $this->actingAs($admin)
        ->get(route('clients.projects.issues.create', [$client, $project]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/create')
            ->has('assignee_options', 3)
            ->where('assignee_options.0.label', 'Unassigned')
            ->where('assignee_options.1.label', 'Admin User')
            ->where('assignee_options.2.label', 'Member User')
        );

    $this->actingAs($admin)
        ->get(route('clients.projects.issues.edit', [$client, $project, $issue]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/edit')
            ->where('issue.assignee.id', $member->id)
            ->where('issue.assignee.name', 'Member User')
            ->missing('assignee_options.3')
        );

    expect($outsider->name)->toBe('Outside User');
});

test('client admins can create and update issues with project assignees only', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();
    $assignee = User::factory()->create(['name' => 'Assigned Member']);
    $outsider = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $assignee->id,
        'role' => 'member',
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $assignee->id,
    ]);

    $this->actingAs($admin)
        ->post(route('clients.projects.issues.store', [$client, $project]), [
            'title' => 'Assigned on create',
            'description' => 'Created with assignee',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'assignee_id' => $assignee->id,
        ])
        ->assertRedirect(route('clients.projects.issues.index', [$client, $project]));

    $issue = Issue::query()->where('title', 'Assigned on create')->firstOrFail();

    expect($issue->assignee_id)->toBe($assignee->id);

    $this->actingAs($admin)
        ->put(route('clients.projects.issues.update', [$client, $project, $issue]), [
            'title' => 'Assigned on update',
            'description' => 'Updated with assignee',
            'status' => 'done',
            'priority' => 'medium',
            'type' => 'task',
            'assignee_id' => null,
        ])
        ->assertRedirect(route('clients.projects.issues.show', [$client, $project, $issue]));

    expect($issue->fresh()->assignee_id)->toBeNull();

    $this->actingAs($admin)
        ->post(route('clients.projects.issues.store', [$client, $project]), [
            'title' => 'Invalid assignment',
            'status' => 'todo',
            'priority' => 'low',
            'type' => 'task',
            'assignee_id' => $outsider->id,
        ])
        ->assertSessionHasErrors('assignee_id');
});

test('project viewers can open an issue detail page but cannot update it', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Read only issue',
        'description' => 'Initial description',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $viewer->id,
        'role' => 'member',
    ]);
    grantIssueManagementPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $viewer->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.projects.issues.show', [$client, $project, $issue]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/show')
            ->where('issue.title', 'Read only issue')
            ->where('can_manage_issue', false)
        );

    $this->actingAs($viewer)
        ->put(route('clients.projects.issues.update', [$client, $project, $issue]), [
            'title' => 'Viewer edited issue',
            'description' => 'Changed',
            'status' => 'done',
            'priority' => 'low',
            'type' => 'task',
        ])
        ->assertForbidden();
});

test('client admins can update issues and issue update is audited', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Original issue',
        'description' => 'Original description',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'due_date' => '2026-05-01',
        'estimated_hours' => '2',
        'label' => 'frontend',
        'creator_id' => $admin->id,
    ]);

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->put(route('clients.projects.issues.update', [$client, $project, $issue]), [
            'title' => 'Updated issue',
            'description' => 'Updated description',
            'status' => 'done',
            'priority' => 'high',
            'type' => 'bug',
            'due_date' => '2026-06-15',
            'estimated_hours' => '7.5',
            'label' => 'urgent',
        ])
        ->assertRedirect(route('clients.projects.issues.show', [$client, $project, $issue]));

    expect($issue->fresh()->title)->toBe('Updated issue');
    expect($issue->fresh()->status)->toBe('done');
    expect($issue->fresh()->due_date?->toDateString())->toBe('2026-06-15');
    expect($issue->fresh()->estimated_hours)->toBe('7.5');
    expect($issue->fresh()->label)->toBe('urgent');

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'issue.updated',
        'source' => 'manual_ui',
        'subject_type' => Issue::class,
        'subject_id' => $issue->id,
    ]);
});

test('client admins can delete issues and issue deletion is audited', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Delete me',
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

    $this->actingAs($admin)
        ->delete(route('clients.projects.issues.destroy', [$client, $project, $issue]))
        ->assertRedirect(route('clients.projects.issues.index', [$client, $project]));

    $this->assertDatabaseMissing('issues', [
        'id' => $issue->id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $admin->id,
        'event' => 'issue.deleted',
        'source' => 'manual_ui',
        'subject_type' => Issue::class,
        'subject_id' => $issue->id,
    ]);
});

test('project members can add issue comments and nested replies', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Threaded issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantIssueManagementPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_WRITE,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $this->actingAs($member)
        ->post(route('clients.projects.issues.comments.store', [$client, $project, $issue]), [
            'body' => 'Top level comment',
        ])
        ->assertRedirect(route('clients.projects.issues.show', [$client, $project, $issue]));

    $comment = IssueComment::query()->where('body', 'Top level comment')->firstOrFail();

    $this->actingAs($member)
        ->post(route('clients.projects.issues.comments.store', [$client, $project, $issue]), [
            'body' => 'Nested reply',
            'parent_id' => $comment->id,
        ])
        ->assertRedirect(route('clients.projects.issues.show', [$client, $project, $issue]));

    $reply = IssueComment::query()->where('body', 'Nested reply')->firstOrFail();

    expect($comment->issue_id)->toBe($issue->id);
    expect($comment->user_id)->toBe($member->id);
    expect($comment->parent_id)->toBeNull();
    expect($reply->parent_id)->toBe($comment->id);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $member->id,
        'event' => 'issue.comment.created',
        'source' => 'manual_ui',
        'subject_type' => IssueComment::class,
        'subject_id' => $comment->id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $member->id,
        'event' => 'issue.comment.created',
        'source' => 'manual_ui',
        'subject_type' => IssueComment::class,
        'subject_id' => $reply->id,
    ]);
});

test('project viewers cannot add issue comments', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $viewer = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Read only thread',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
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

    $this->actingAs($viewer)
        ->post(route('clients.projects.issues.comments.store', [$client, $project, $issue]), [
            'body' => 'Viewer comment',
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('issue_comments', [
        'issue_id' => $issue->id,
        'body' => 'Viewer comment',
    ]);
});

test('issue detail exposes nested comments in thread order', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);
    $member = User::factory()->create();
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Commented issue',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => User::factory()->create()->id,
    ]);

    $membership = ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $member->id,
        'role' => 'member',
    ]);
    grantIssueManagementPermissions($membership, [
        ClientPermissionCatalog::PROJECTS_READ,
        ClientPermissionCatalog::ISSUES_READ,
    ]);

    ProjectMembership::query()->create([
        'project_id' => $project->id,
        'user_id' => $member->id,
    ]);

    $comment = IssueComment::query()->create([
        'issue_id' => $issue->id,
        'user_id' => $member->id,
        'body' => 'Parent comment',
    ]);

    $reply = IssueComment::query()->create([
        'issue_id' => $issue->id,
        'user_id' => $member->id,
        'parent_id' => $comment->id,
        'body' => 'Reply comment',
    ]);

    $this->actingAs($member)
        ->get(route('clients.projects.issues.show', [$client, $project, $issue]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/show')
            ->has('comments', 1)
            ->where('comments.0.id', $comment->id)
            ->where('comments.0.body', 'Parent comment')
            ->where('comments.0.replies.0.id', $reply->id)
            ->where('comments.0.replies.0.body', 'Reply comment')
        );
});

test('issue index supports server backed search and sorting', function () {
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

    Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Alpha issue',
        'status' => 'todo',
        'priority' => 'low',
        'type' => 'task',
        'creator_id' => $admin->id,
    ]);
    Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Zulu issue',
        'status' => 'todo',
        'priority' => 'high',
        'type' => 'bug',
        'creator_id' => $admin->id,
    ]);

    $this->actingAs($admin)
        ->get(route('clients.projects.issues.index', [
            $client,
            $project,
            'search' => 'issue',
            'sort_by' => 'title',
            'sort_direction' => 'desc',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('issues/index')
            ->where('issues.0.title', 'Zulu issue')
            ->where('issues.1.title', 'Alpha issue')
            ->where('filters.search', 'issue')
            ->where('filters.sort_by', 'title')
            ->where('filters.sort_direction', 'desc')
        );
});
