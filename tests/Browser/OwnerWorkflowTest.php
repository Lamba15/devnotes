<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseMigrations;
use Laravel\Dusk\Browser;

uses(DatabaseMigrations::class);

function setNativeInputValue(Browser $browser, string $selector, string $value): void
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

test('owner can log in and land on overview', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);

    $this->browse(function (Browser $browser) use ($owner) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->visit('/login')
            ->waitFor("input[name='email']", 20)
            ->type('email', $owner->email)
            ->type('password', 'password')
            ->press('Log in')
            ->waitForLocation('/overview', 20)
            ->assertPathIs('/overview')
            ->assertSee('Overview');
    });
});

test('owner can create a client project and client user through the browser', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);

    $this->browse(function (Browser $browser) use ($owner) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit('/clients/create')
            ->waitFor("input[name='name']", 20);

        setNativeInputValue($browser, "input[name='name']", 'Acme Studio');

        $browser->press('Create client')
            ->waitForText('Acme Studio', 20)
            ->assertSee('Acme Studio');
    });

    $client = Client::query()->where('name', 'Acme Studio')->firstOrFail();
    $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

    $this->browse(function (Browser $browser) use ($client, $activeStatus, $owner) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit("/clients/{$client->id}/projects/create")
            ->waitFor("input[name='name']", 20);

        setNativeInputValue($browser, "input[name='name']", 'Website Refresh');
        setNativeInputValue($browser, "textarea[name='description']", 'Refresh the public website');

        $browser->click('#status_id')
            ->waitForText($activeStatus->name, 20);

        $browser->script(
            "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ".json_encode($activeStatus->name, JSON_THROW_ON_ERROR).")?.click();"
        );

        $browser->press('Create project')
            ->waitForText('Website Refresh', 20)
            ->assertSee('Website Refresh')
            ->visit("/clients/{$client->id}/members/create")
            ->waitFor("input[name='name']", 20);

        setNativeInputValue($browser, "input[name='name']", 'Portal Viewer');
        setNativeInputValue($browser, "input[name='email']", 'portal-viewer@example.com');
        setNativeInputValue($browser, "input[name='password']", 'secret-pass-123');

        $browser->click('#role')
            ->waitForText('Viewer', 20);

        $browser->script(
            "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Viewer')?.click();"
        );

        $browser->press('Create client user')
            ->waitForText('portal-viewer@example.com', 20)
            ->assertSee('portal-viewer@example.com')
            ->assertSee('viewer');
    });

    expect(User::query()->where('email', 'portal-viewer@example.com')->exists())->toBeTrue();
});

test('owner can create a project linked transaction through the browser', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);
    $client = Client::factory()->create([
        'name' => 'Finance Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = $client->projects()->create([
        'name' => 'Finance Project',
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->browse(function (Browser $browser) use ($owner, $project) {
        $browser->driver->manage()->deleteAllCookies();

        $browser->loginAs($owner)
            ->visit('/finance/transactions/create')
            ->waitFor('#project_id', 20);

        $browser->click('#project_id')
            ->waitForText('Finance Client / Finance Project', 20);

        $browser->script(
            "[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Finance Client / Finance Project')?.click();"
        );

        setNativeInputValue($browser, "input[name='description']", 'Discovery session');
        setNativeInputValue($browser, "input[name='amount']", '1200.00');
        setNativeInputValue($browser, "input[name='occurred_at']", '2026-04-05');

        $browser->press('Create transaction')
            ->waitForText('Discovery session', 20)
            ->assertSee('Finance Project')
            ->assertSee('Discovery session')
            ->assertSee('1200.00');
    });
});

test('owner can create a project linked invoice through the assistant with confirmation', function () {
    $owner = User::factory()->create([
        'password' => 'password',
    ]);
    $client = Client::factory()->create([
        'name' => 'Assistant Finance Client',
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = $client->projects()->create([
        'name' => 'Assistant Finance Project',
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->browse(function (Browser $browser) use ($owner, $project) {
        $prompt = json_encode("Create invoice with reference INV-DUSK-001 for project {$project->id}, amount 4500, status draft", JSON_THROW_ON_ERROR);

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
                "Create invoice with reference INV-DUSK-001 for project {$project->id}, amount 4500, status draft"
            )
            ->click("button[data-testid='assistant-send']")
            ->waitForText('Review and confirm this action before it executes.', 60)
            ->assertSee('create_invoice')
            ->assertSee('INV-DUSK-001')
            ->click("button[data-testid='assistant-confirm']")
            ->waitForText('Invoice created: INV-DUSK-001', 60)
            ->assertSee('Assistant Finance Project')
            ->assertSee('4500.00');
    });
});
