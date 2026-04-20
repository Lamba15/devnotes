<?php

use App\Models\AuditLog;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembershipPermission;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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

    $response = $this->actingAs($owner)->post(route('clients.members.store', $client), [
        'name' => 'Portal Member',
        'email' => 'member@example.com',
        'password' => 'secret-pass-123',
        'role' => 'member',
    ]);

    $memberUser = User::query()->where('email', 'member@example.com')->firstOrFail();
    $membership = $client->memberships()->where('user_id', $memberUser->id)->firstOrFail();

    $response->assertRedirect(route('clients.members.show', [$client, $membership]));

    expect($memberUser->name)->toBe('Portal Member');
    expect($memberUser->email_verified_at)->not->toBeNull();

    $this->assertDatabaseHas('client_memberships', [
        'client_id' => $client->id,
        'user_id' => $memberUser->id,
        'role' => 'member',
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
        ]);

    $memberUser = User::query()->where('email', 'client-admin@example.com')->firstOrFail();
    $membership = $client->memberships()->where('user_id', $memberUser->id)->firstOrFail();

    $this->actingAs($owner)
        ->get(route('clients.members.show', [$client, $membership]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('clients/members/show'));

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.created',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $memberUser->id,
    ]);
});

test('member profile handles users with audit activity but no assistant runs', function () {
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
        ]);

    $memberUser = User::query()->where('email', 'member@example.com')->firstOrFail();
    $membership = $client->memberships()->where('user_id', $memberUser->id)->firstOrFail();

    AuditLog::query()->create([
        'user_id' => $memberUser->id,
        'event' => 'member.profile.viewed',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $memberUser->id,
    ]);

    $this->actingAs($owner)
        ->get(route('clients.members.show', [$client, $membership]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/members/show')
            ->where('membership.activity.last_activity_at', fn ($value) => is_string($value) && $value !== '')
        );
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
        ]);

    auth()->logout();

    $this->post(route('login.store'), [
        'email' => 'member@example.com',
        'password' => 'secret-pass-123',
    ])->assertRedirect(route('overview'));

    $this->assertAuthenticated();
});

test('client staff managers can open member profiles, update identity, and sync permissions', function () {
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
        ]);

    $membership = $client->memberships()->with('user')->firstOrFail();

    $this->actingAs($owner)
        ->get(route('clients.members.edit', [$client, $membership]))
        ->assertRedirect(route('clients.members.show', [$client, $membership]));

    $this->actingAs($owner)
        ->get(route('clients.members.show', [$client, $membership]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/members/show')
            ->where('can_manage_passwords', true)
        );

    $this->actingAs($owner)
        ->put(route('clients.members.update', [$client, $membership]), [
            'name' => 'Portal Admin',
            'email' => 'member@example.com',
            'role' => 'member',
        ])
        ->assertRedirect(route('clients.members.show', [$client, $membership]));

    $this->actingAs($owner)
        ->put(route('clients.members.permissions.update', [$client, $membership]), [
            'permissions' => [
                ClientPermissionCatalog::FINANCE_WRITE,
                ClientPermissionCatalog::MEMBERS_WRITE,
            ],
        ])
        ->assertRedirect(route('clients.members.show', [$client, $membership]));

    expect($membership->user->fresh()->name)->toBe('Portal Admin');
    expect($membership->fresh()->permissionNames())->toEqualCanonicalizing([
        ClientPermissionCatalog::FINANCE_READ,
        ClientPermissionCatalog::FINANCE_WRITE,
        ClientPermissionCatalog::MEMBERS_READ,
        ClientPermissionCatalog::MEMBERS_WRITE,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.updated',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $membership->user_id,
    ]);

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'client.user.permissions_synced',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $membership->user_id,
    ]);
});

test('members with members read can open member profiles but cannot update them', function () {
    $owner = User::factory()->create();
    $viewer = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $this->actingAs($owner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Target Member',
            'email' => 'target@example.com',
            'password' => 'secret-pass-123',
            'role' => 'member',
        ]);

    $targetMembership = $client->memberships()->whereHas('user', fn ($query) => $query->where('email', 'target@example.com'))->firstOrFail();

    $viewerMembership = $client->memberships()->create([
        'user_id' => $viewer->id,
        'role' => 'member',
        'created_by' => $owner->id,
    ]);

    ClientMembershipPermission::query()->create([
        'client_membership_id' => $viewerMembership->id,
        'permission_name' => ClientPermissionCatalog::MEMBERS_READ,
        'granted_by' => $owner->id,
    ]);

    $this->actingAs($viewer)
        ->get(route('clients.members.show', [$client, $targetMembership]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('clients/members/show')
            ->where('membership.id', $targetMembership->id)
            ->where('can_manage_members', false)
            ->where('can_manage_passwords', false)
        );

    $this->actingAs($viewer)
        ->put(route('clients.members.update', [$client, $targetMembership]), [
            'name' => 'Updated Name',
            'email' => 'target@example.com',
            'role' => 'member',
        ])
        ->assertForbidden();
});

test('platform owner can change a client member password', function () {
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
        ]);

    $membership = $client->memberships()->with('user')->firstOrFail();

    $this->actingAs($owner)
        ->put(route('clients.members.password.update', [$client, $membership]), [
            'password' => 'new-secret-pass-456',
            'password_confirmation' => 'new-secret-pass-456',
        ])
        ->assertRedirect(route('clients.members.show', [$client, $membership]));

    expect(Hash::check('new-secret-pass-456', $membership->user->fresh()->password))
        ->toBeTrue();

    $this->assertDatabaseHas('audit_logs', [
        'user_id' => $owner->id,
        'event' => 'user.password_changed_by_platform_owner',
        'source' => 'manual_ui',
        'subject_type' => User::class,
        'subject_id' => $membership->user_id,
    ]);
});

test('client admins cannot change another member password', function () {
    $platformOwner = User::factory()->create();
    $clientAdmin = User::factory()->create();
    $client = Client::factory()->create([
        'behavior_id' => Behavior::query()->firstOrFail()->id,
    ]);

    $client->memberships()->create([
        'user_id' => $clientAdmin->id,
        'role' => 'admin',
        'created_by' => $platformOwner->id,
    ]);

    $this->actingAs($platformOwner)
        ->post(route('clients.members.store', $client), [
            'name' => 'Target Member',
            'email' => 'target@example.com',
            'password' => 'secret-pass-123',
            'role' => 'member',
        ]);

    $membership = $client->memberships()
        ->whereHas('user', fn ($query) => $query->where('email', 'target@example.com'))
        ->firstOrFail();

    $this->actingAs($clientAdmin)
        ->put(route('clients.members.password.update', [$client, $membership]), [
            'password' => 'new-secret-pass-456',
            'password_confirmation' => 'new-secret-pass-456',
        ])
        ->assertForbidden();

    expect(Hash::check('secret-pass-123', $membership->user->fresh()->password))
        ->toBeTrue();
});

test('switching a membership to admin clears stored permission rows', function () {
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
        ]);

    $membership = $client->memberships()->firstOrFail();

    ClientMembershipPermission::query()->create([
        'client_membership_id' => $membership->id,
        'permission_name' => ClientPermissionCatalog::PROJECTS_READ,
        'granted_by' => $owner->id,
    ]);

    $this->actingAs($owner)
        ->put(route('clients.members.update', [$client, $membership]), [
            'name' => 'Portal Member',
            'email' => 'member@example.com',
            'role' => 'admin',
        ])
        ->assertRedirect(route('clients.members.show', [$client, $membership]));

    expect($membership->fresh()->role)->toBe('admin');
    expect($membership->fresh('permissions')->permissionNames())->toBe([]);
});

test('client admins can remove memberships and removal is audited', function () {
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
            'role' => 'member',
        ]);

    $alphaMembership = $client->memberships()->whereHas('user', fn ($query) => $query->where('email', 'alpha@example.com'))->firstOrFail();

    $this->actingAs($owner)
        ->put(route('clients.members.permissions.update', [$client, $alphaMembership]), [
            'permissions' => [ClientPermissionCatalog::FINANCE_WRITE],
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
            ->where('memberships.0.role', 'admin')
            ->where('memberships.1.user.name', 'Alpha Member')
            ->where('memberships.1.permissions', [
                ClientPermissionCatalog::FINANCE_READ,
                ClientPermissionCatalog::FINANCE_WRITE,
            ])
            ->where('filters.search', 'member')
            ->where('filters.sort_by', 'name')
            ->where('filters.sort_direction', 'desc')
        );
});
