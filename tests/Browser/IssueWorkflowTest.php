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
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

function setNativeIssueInputValue(Browser $browser, string $selector, string $value): void
{
    $encodedSelector = json_encode($selector, JSON_THROW_ON_ERROR);
    $encodedValue = json_encode($value, JSON_THROW_ON_ERROR);

    $browser->script(
        "const element = document.querySelector({$encodedSelector});".
        "const value = {$encodedValue};".
        'const previousValue = element.value;'.
        'const prototype = element instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;'.
        "const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;".
        'setter.call(element, value);'.
        'const tracker = element._valueTracker;'.
        'if (tracker) { tracker.setValue(previousValue); }'.
        "element.dispatchEvent(new Event('input', { bubbles: true }));".
        "element.dispatchEvent(new Event('change', { bubbles: true }));"
    );
}

function clickDomElement(Browser $browser, string $selector): void
{
    $encodedSelector = json_encode($selector, JSON_THROW_ON_ERROR);

    $browser->script(
        "const element = document.querySelector({$encodedSelector});".
        "if (!element) { throw new Error('Unable to find DOM element to click'); }".
        'element.click();'
    );
}

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
        $createPath = route('clients.projects.issues.create', [$client, $project], false);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit(route('clients.projects.issues.index', [$client, $project], false))
            ->waitFor("a[href='{$createPath}']", 20)
            ->waitUsing(20, 100, fn () => (bool) $browser->script(
                'return document.querySelector('.json_encode("a[href='{$createPath}']", JSON_THROW_ON_ERROR).') !== null;'
            )[0]);

        clickDomElement($browser, "a[href='{$createPath}']");

        $browser->waitFor("input[name='title']", 20)
            ->waitFor("[data-testid='dynamic-form-submit']", 20);

        setNativeIssueInputValue($browser, "input[name='title']", 'Browser issue');
        clickDomElement($browser, "[data-testid='dynamic-form-submit']");

        $browser->waitForText('Browser issue', 20)
            ->assertSee('Browser issue')
            ->assertSee('todo')
            ->assertSee('medium')
            ->assertSee('task');
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

test('issue detail renders created and comment timestamps in the saved user timezone', function () {
    $client = Client::factory()->create([
        'name' => 'Timezone Issue Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        'name' => 'Timezone Issue Project',
    ]);
    $member = User::factory()->create([
        'password' => 'password',
        'timezone' => 'Asia/Tokyo',
    ]);
    $issue = Issue::query()->create([
        'project_id' => $project->id,
        'title' => 'Timezone detail issue',
        'description' => 'Timestamp detail target',
        'status' => 'todo',
        'priority' => 'medium',
        'type' => 'task',
        'creator_id' => $member->id,
    ]);

    $comment = IssueComment::query()->create([
        'issue_id' => $issue->id,
        'user_id' => $member->id,
        'body' => 'Timezone detail comment',
    ]);

    $issueTimestamp = CarbonImmutable::parse('2026-03-12 12:35:00', 'UTC');
    $commentTimestamp = CarbonImmutable::parse('2026-03-12 12:40:00', 'UTC');

    Issue::query()->whereKey($issue->id)->update([
        'created_at' => $issueTimestamp,
        'updated_at' => $issueTimestamp,
    ]);
    IssueComment::query()->whereKey($comment->id)->update([
        'created_at' => $commentTimestamp,
        'updated_at' => $commentTimestamp,
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
            ->waitForText('Timezone detail issue', 20)
            ->assertSee('Created 12 MAR 2026, 21:35')
            ->assertSee('12 MAR 2026, 21:40');
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
        $prompt = json_encode("Use the create_issue tool to create issue titled 'Browser AI Issue' for project {$project->id}, status todo, priority high, type bug", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit('/overview#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']")
            ->waitFor("button[data-testid='assistant-send']");

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
                "Use the create_issue tool to create issue titled 'Browser AI Issue' for project {$project->id}, status todo, priority high, type bug"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Review and confirm this action before it executes.', 60)
            ->assertSee('create_issue')
            ->assertSee('Browser AI Issue')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Issue created: Browser AI Issue', 60)
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
        $prompt = json_encode("Use the add_issue_comment tool to add comment 'Browser AI comment' to issue {$issue->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false).'#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']")
            ->waitFor("button[data-testid='assistant-send']");

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
                "Use the add_issue_comment tool to add comment 'Browser AI comment' to issue {$issue->id}"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Review and confirm this action before it executes.', 60)
            ->assertSee('add_issue_comment')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Comment added:', 60)
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
        $prompt = json_encode("Use the reply_to_issue_comment tool to post reply 'Browser AI reply' to comment {$parentComment->id} on issue {$issue->id}", JSON_THROW_ON_ERROR);

        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($member)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false))
            ->waitForText('Existing thread root', 20)
            ->visit(route('clients.projects.issues.show', [$client, $project, $issue], false).'#assistant')
            ->waitForText('Reads run directly. Mutations require confirmation.', 20)
            ->waitFor("textarea[name='assistant_message']")
            ->waitFor("button[data-testid='assistant-send']");

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
                "Use the reply_to_issue_comment tool to post reply 'Browser AI reply' to comment {$parentComment->id} on issue {$issue->id}"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Review and confirm this action before it executes.', 60)
            ->assertSee('reply_to_issue_comment')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Reply added:', 60)
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
