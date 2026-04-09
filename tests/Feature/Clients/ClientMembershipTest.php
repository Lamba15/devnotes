<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('authenticated users can visit a client members page', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($user)
        ->get(route('clients.members.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/members/index')
            ->where('client.id', $client->id)
            ->where('client.name', $client->name)
        );
});

test('client user creation requires name email password and role', function () {
    $user = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($user)
        ->post(route('clients.members.store', $client), [])
        ->assertSessionHasErrors([
            'name',
            'email',
            'password',
            'role',
        ]);
});

test('authenticated users can create a client user and attach a membership', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Portal Viewer',
            'email' => 'viewer@example.com',
            'password' => 'secret-pass-123',
            'role' => 'viewer',
        ])
        ->assertRedirect(route('clients.members.index', $client));

    $memberUser = User::query()->where('email', 'viewer@example.com')->firstOrFail();

    expect($memberUser->name)->toBe('Portal Viewer');
    expect($memberUser->email_verified_at)->not->toBeNull();

    $this->assertDatabaseHas('client_memberships', [
        'client_id' => $client->id,
        'user_id' => $memberUser->id,
        'role' => 'viewer',
        'created_by' => $owner->id,
    ]);
});

test('client user creation is audited', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Client Admin',
            'email' => 'client-admin@example.com',
            'password' => 'secret-pass-123',
            'role' => 'admin',
        ])
        ->assertRedirect(route('clients.members.index', $client));

    $memberUser = User::query()->where('email', 'client-admin@example.com')->firstOrFail();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.created',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $memberUser->id,
    ]);
});

test('a created client user can log in with the assigned credentials', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Portal Member',
            'email' => 'member@example.com',
            'password' => 'secret-pass-123',
            'role' => 'member',
        ])
        ->assertRedirect(route('clients.members.index', $client));

    auth()->logout();

    $this->post(route('login.store'), [
        'email' => 'member@example.com',
        'password' => 'secret-pass-123',
    ])->assertRedirect(route('overview'));

    $this->assertAuthenticated();
});

test('client admins can visit dedicated member edit page and update membership', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Portal Viewer',
            'email' => 'viewer@example.com',
            'password' => 'secret-pass-123',
            'role' => 'viewer',
        ]);

    $membership = $client->memberships()->with('user')->firstOrFail();

    $this->actingAs($owner)
        ->get(route('clients.members.edit', [$client, $membership]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('clients/members/edit'));

    $this->actingAs($owner)
        ->put(route('clients.members.update', [$client, $membership]), [
            'name' => 'Portal Admin',
            'email' => 'viewer@example.com',
            'role' => 'admin',
        ])
        ->assertRedirect(route('clients.members.index', $client));

    expect($membership->fresh()->role)->toBe('admin');
    expect($membership->user->fresh()->name)->toBe('Portal Admin');

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.updated',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $membership->user_id,
    ]);
});

test('client admins can remove memberships and removal is audited', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Portal Viewer',
            'email' => 'viewer@example.com',
            'password' => 'secret-pass-123',
            'role' => 'viewer',
        ]);

    $membership = $client->memberships()->firstOrFail();

    $this->actingAs($owner)
        ->delete(route('clients.members.destroy', [$client, $membership]))
        ->assertRedirect(route('clients.members.index', $client));

    $this->assertDatabaseMissing('client_memberships', [
        'id' => $membership->id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.removed',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $membership->user_id,
    ]);
});

test('client members index supports server backed search and sorting', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Alpha Member',
            'email' => 'alpha@example.com',
            'password' => 'secret-pass-123',
            'role' => 'viewer',
        ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Zulu Member',
            'email' => 'zulu@example.com',
            'password' => 'secret-pass-123',
            'role' => 'admin',
        ]);

    $this->actingAs($owner)
        ->get(route('clients.members.index', [
            $client,
            'search' => 'member',
            'sort_by' => 'name',
            'sort_direction' => 'desc',
        ]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/members/index')
            ->where('memberships.0.user.name', 'Zulu Member')
            ->where('memberships.1.user.name', 'Alpha Member')
            ->where('filters.search', 'member')
            ->where('filters.sort_by', 'name')
            ->where('filters.sort_direction', 'desc')
        );
});
