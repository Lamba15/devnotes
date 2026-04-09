<?php

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('client scoped users do not see internal client profile fields', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
        'industry' => 'Real Estate',
        'country_of_origin' => 'Egypt',
        'origin' => 'friend referral',
        'notes' => 'hostile relationship note',
    ]);
    $user = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $this->actingAs($user)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('client.industry', null)
            ->where('client.country_of_origin', null)
            ->where('client.origin', null)
            ->where('client.notes', null)
            ->where('can_view_internal_client_profile', false)
            ->where('can_edit_internal_client_profile', false)
        );
});

test('client scoped users cannot open the internal client edit page', function () {
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
        ->get(route('clients.edit', $client))
        ->assertForbidden();
});
