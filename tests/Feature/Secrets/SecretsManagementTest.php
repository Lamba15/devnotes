<?php

use App\Models\AuditLog;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\SecretEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

test('platform owner can create and reveal a client secret', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.secrets.store', $client), [
            'label' => 'Client wifi',
            'description' => 'Front desk router',
            'secret_value' => 'router-password-123',
        ])
        ->assertRedirect(route('clients.show', $client));

    $secret = SecretEntry::query()->firstOrFail();

    expect($secret->secretable_type)->toBe(Client::class)
        ->and($secret->secretable_id)->toBe($client->id)
        ->and($secret->label)->toBe('Client wifi')
        ->and($secret->secret_value)->toBe('router-password-123');

    expect(DB::table('secret_entries')->where('id', $secret->id)->value('secret_value'))
        ->not->toBe('router-password-123');

    $this->actingAs($owner)
        ->get(route('clients.secrets.reveal', [$client, $secret]))
        ->assertOk()
        ->assertJson([
            'id' => $secret->id,
            'secret_value' => 'router-password-123',
        ]);

    $auditLog = AuditLog::query()->where('event', 'secret_entry.revealed')->latest('id')->firstOrFail();

    expect($auditLog->metadata_json['label'])->toBe('Client wifi');
});

test('platform owner can create and reveal a project secret', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $project = Project::factory()->create([
        'client_id' => $client->id,
        'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.projects.secrets.store', [$client, $project]), [
            'label' => 'Database password',
            'description' => 'Production database',
            'secret_value' => 'db-secret-456',
        ])
        ->assertRedirect(route('clients.projects.show', [$client, $project]));

    $secret = SecretEntry::query()->firstOrFail();

    $this->actingAs($owner)
        ->get(route('clients.projects.secrets.reveal', [$client, $project, $secret]))
        ->assertOk()
        ->assertJson([
            'id' => $secret->id,
            'secret_value' => 'db-secret-456',
        ]);
});

test('client scoped users cannot manage secrets and do not see secret metadata', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);
    $user = User::factory()->create();

    ClientMembership::query()->create([
        'client_id' => $client->id,
        'user_id' => $user->id,
        'role' => 'admin',
    ]);

    $client->secrets()->create([
        'label' => 'Hidden client secret',
        'description' => 'Owner only',
        'secret_value' => 'secret-value',
    ]);

    $this->actingAs($user)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('secrets', [])
            ->where('can_manage_secrets', false)
        );

    $secret = SecretEntry::query()->firstOrFail();

    $this->actingAs($user)
        ->get(route('clients.secrets.reveal', [$client, $secret]))
        ->assertForbidden();
});

test('secret page props and audit snapshots never expose secret values', function () {
    $owner = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $secret = $client->secrets()->create([
        'label' => 'Mail password',
        'description' => 'Inbox access',
        'secret_value' => 'super-secret',
    ]);

    $this->actingAs($owner)
        ->get(route('clients.show', $client))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/show')
            ->where('secrets.0.label', 'Mail password')
            ->missing('secrets.0.secret_value')
        );

    $this->actingAs($owner)
        ->put(route('clients.secrets.update', [$client, $secret]), [
            'label' => 'Mail password updated',
            'description' => 'Inbox access',
            'secret_value' => '',
        ])
        ->assertRedirect(route('clients.show', $client));

    $auditLog = AuditLog::query()->where('event', 'secret_entry.updated')->latest('id')->firstOrFail();

    expect(json_encode($auditLog->before_json))->not->toContain('super-secret')
        ->and(json_encode($auditLog->after_json))->not->toContain('super-secret')
        ->and(json_encode($auditLog->metadata_json))->not->toContain('super-secret');
});

test('secret entries hide secret value during serialization', function () {
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $secret = $client->secrets()->create([
        'label' => 'API key',
        'description' => null,
        'secret_value' => 'api-key-123',
    ]);

    expect($secret->toArray())->not->toHaveKey('secret_value')
        ->and($secret->fresh()->secret_value)->toBe('api-key-123');
});
