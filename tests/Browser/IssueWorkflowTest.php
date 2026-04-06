<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

test('owner can create an issue from the project issue index', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);
    $client = Client::factory()->create([
        'name' => 'Issue Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Issue Project',
    ]);

    $this->browse(function (Browser $browser) use ($owner, $client, $project) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit(route('clients.projects.issues.index', [$client, $project], false))
            ->waitFor("input[name='title']", 20)
            ->type('title', 'Browser issue')
            ->type('description', 'Created through Dusk')
            ->select('status', 'todo')
            ->select('priority', 'high')
            ->select('type', 'bug')
            ->press('Create issue')
            ->waitForText('Browser issue', 20)
            ->assertSee('Browser issue')
            ->assertSee('high');
    });
});

test('viewer can open an issue but cannot edit it', function () {
    $client = Client::factory()->create([
        'name' => 'Viewer Issue Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Viewer Issue Project',
    ]);
    $viewer = User::factory()->create([
        'password' => 'password',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Read only issue',
        'description' => 'Viewer can inspect this',
        'status' => 'todo',
        'priority' => 'medium',
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

    $this->browse(function (Browser $browser) use ($viewer, $client, $project, $issue) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($viewer)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false))
            ->waitForText('Read only issue', 20)
            ->assertSee('Viewer can inspect this')
            ->assertDontSee('Update issue')
            ->assertSee('Status: todo');
    });
});

test('owner can create an issue through the assistant with confirmation', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);
    $client = Client::factory()->create([
        'name' => 'Assistant Issue Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Assistant Issue Project',
    ]);

    $this->browse(function (Browser $browser) use ($owner, $project) {
        $prompt = json_encode("Create issue Browser AI Issue for project {$project->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit('/overview#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']");

        $browser->script(
            "const textarea = document.querySelector(\"textarea[name='assistant_message']\");".
            "const value = {$prompt};".
            'const previousValue = textarea.value;'.
            "const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;".
            'setter.call(textarea, value);'.
            'const tracker = textarea._valueTracker;'.
            'if (tracker) { tracker.setValue(previousValue); }'.
            "textarea.dispatchEvent(new Event('input', { bubbles: true }));".
            "textarea.dispatchEvent(new Event('change', { bubbles: true }));"
        );

        $browser
            ->assertScript(
                "document.querySelector(\"textarea[name='assistant_message']\").value",
                "Create issue Browser AI Issue for project {$project->id}"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Pending confirmation', 20)
            ->assertSee('create_issue')
            ->assertSee('Browser AI Issue')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Issue created: Browser AI Issue', 20)
            ->assertSee('Assistant Issue Project')
            ->assertSee('todo / high');
    });

    expect(Issue::query()->where('title', 'Browser AI Issue')->exists())->toBeTrue();
});

test('member can create a nested issue reply thread in the browser', function () {
    $client = Client::factory()->create([
        'name' => 'Comment Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Comment Project',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Discussion issue',
        'description' => 'Thread discussion target',
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

    $this->browse(function (Browser $browser) use ($member, $client, $project, $issue) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false))
            ->waitFor("textarea[name='comment_body']", 20)
            ->type('comment_body', 'First browser comment')
            ->press('Add comment')
            ->waitForText('First browser comment', 20)
            ->assertSee('First browser comment')
            ->type('reply_body_1', 'Nested browser reply')
            ->press('Reply')
            ->waitForText('Nested browser reply', 20)
            ->assertSee('Nested browser reply');
    });
});

test('member can add an issue comment through the assistant with confirmation', function () {
    $client = Client::factory()->create([
        'name' => 'Assistant Comment Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Assistant Comment Project',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Assistant comment issue',
        'description' => 'Target for assistant comment creation',
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

    $this->browse(function (Browser $browser) use ($member, $client, $project, $issue) {
        $prompt = json_encode("Add comment Browser AI comment to issue {$issue->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false).'#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']");

        $browser->script(
            "const textarea = document.querySelector(\"textarea[name='assistant_message']\");".
            "const value = {$prompt};".
            'const previousValue = textarea.value;'.
            "const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;".
            'setter.call(textarea, value);'.
            'const tracker = textarea._valueTracker;'.
            'if (tracker) { tracker.setValue(previousValue); }'.
            "textarea.dispatchEvent(new Event('input', { bubbles: true }));".
            "textarea.dispatchEvent(new Event('change', { bubbles: true }));"
        );

        $browser
            ->assertScript(
                "document.querySelector(\"textarea[name='assistant_message']\").value",
                "Add comment Browser AI comment to issue {$issue->id}"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Pending confirmation', 20)
            ->assertSee('add_issue_comment')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Comment added:', 20)
            ->assertSee('Assistant comment issue')
            ->assertSee('Browser AI comment');
    });

    expect(IssueComment::query()->where('issue_id', $issue->id)->where('body', 'Browser AI comment')->exists())->toBeTrue();
});

test('member can add an issue reply through the assistant with confirmation', function () {
    $client = Client::factory()->create([
        'name' => 'Assistant Reply Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Assistant Reply Project',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Assistant reply issue',
        'description' => 'Target for assistant reply creation',
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

    $parentComment = IssueComment::query()->create([
        'issue_id' => $issue->id,
        'user_id' => User::factory()->create()->id,
        'body' => 'Existing thread root',
    ]);

    $this->browse(function (Browser $browser) use ($member, $client, $project, $issue, $parentComment) {
        $prompt = json_encode("Reply Browser AI reply to comment {$parentComment->id} on issue {$issue->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false).'#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']")
            ->assertSee('Existing thread root');

        $browser->script(
            "const textarea = document.querySelector(\"textarea[name='assistant_message']\");".
            "const value = {$prompt};".
            'const previousValue = textarea.value;'.
            "const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;".
            'setter.call(textarea, value);'.
            'const tracker = textarea._valueTracker;'.
            'if (tracker) { tracker.setValue(previousValue); }'.
            "textarea.dispatchEvent(new Event('input', { bubbles: true }));".
            "textarea.dispatchEvent(new Event('change', { bubbles: true }));"
        );

        $browser
            ->assertScript(
                "document.querySelector(\"textarea[name='assistant_message']\").value",
                "Reply Browser AI reply to comment {$parentComment->id} on issue {$issue->id}"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Pending confirmation', 20)
            ->assertSee('reply_to_issue_comment')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Reply added:', 20)
            ->assertSee('Assistant reply issue')
            ->assertSee('Browser AI reply');
    });

    expect(
        IssueComment::query()
            ->where('issue_id', $issue->id)
            ->where('parent_id', $parentComment->id)
            ->where('body', 'Browser AI reply')
            ->exists()
    )->toBeTrue();
});
