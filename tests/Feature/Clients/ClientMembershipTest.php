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
