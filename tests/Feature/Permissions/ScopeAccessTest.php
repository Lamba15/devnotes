<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('client scoped users only see their own clients on the clients index', function () {
    $behavior = Behavior::query()->firstOrFail();
    $allowedClient = Client::factory()->create([
        'name' => 'Ammar',
        'behavior_id' => $behavior->id,
    ]);
    Client::factory()->create([
        'name' => 'Other Client',
        'behavior_id' => $behavior->id,
    ]);
    $user = User::factory()->create([
        'email_verified_at' => now(),
    ]);

    ClientMembership::query()->create([
        'client_id' => $allowedClient->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $this->actingAs($user)
        ->get(route('clients.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/index')
            ->has('clients', 1)
            ->where('clients.0.name', 'Ammar')
            ->where('can_create_clients', false)
        );
});

test('client scoped users are redirected from overview into their first client workspace', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $user = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $this->actingAs($user)
        ->get(route('overview'))
        ->assertRedirect(route('clients.show', $client));
});

test('client scoped users cannot access platform only top level routes', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $user = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $this->actingAs($user)->get('/finance/transactions')->assertForbidden();
    $this->actingAs($user)->get('/tracking/issues')->assertForbidden();
    $this->actingAs($user)->get('/cms/pages')->assertForbidden();
    $this->actingAs($user)->get('/clients/tags')->assertForbidden();
    $this->actingAs($user)->get('/settings/ai')->assertForbidden();
});

test('client scoped users can access general settings but not ai settings', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $user = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $this->actingAs($user)->get('/settings/profile')->assertOk();
    $this->actingAs($user)->get('/settings/ai')->assertForbidden();
});
