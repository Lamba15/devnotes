<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('client admins can visit client statuses index and create page', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->get(route('clients.statuses.index', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('clients/statuses'));

    $this->actingAs($admin)
        ->get(route('clients.statuses.create', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('clients/statuses-create'));
});

test('client admins can create edit and delete client specific statuses', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $admin = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $admin->id,
        'role' => 'admin',
    ]);

    $this->actingAs($admin)
        ->post(route('clients.statuses.store', $client), [
            'name' => 'Client Review',
            'slug' => 'client-review',
        ])
        ->assertRedirect(route('clients.statuses.index', $client));

    $status = ProjectStatus::query()->where('slug', 'client-review')->firstOrFail();
    expect($status->client_id)->toBe($client->id);

    $this->actingAs($admin)
        ->get(route('clients.statuses.edit', [$client, $status]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('clients/statuses-edit'));

    $this->actingAs($admin)
        ->put(route('clients.statuses.update', [$client, $status]), [
            'name' => 'Client Ready',
            'slug' => 'client-ready',
        ])
        ->assertRedirect(route('clients.statuses.index', $client));

    expect($status->fresh()->slug)->toBe('client-ready');

    $this->actingAs($admin)
        ->delete(route('clients.statuses.destroy', [$client, $status]))
        ->assertRedirect(route('clients.statuses.index', $client));

    $this->assertDatabaseMissing('project_statuses', ['id' => $status->id]);
});
