<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Auth\Access\AuthorizationException;

class CreateClientUser
{
    public function handle(
        User $actor,
        Client $client,
        array $attributes,
        string $source = 'manual_ui',
    ): ClientMembership {
        if (! $actor->canManageMembers($client)) {
            throw new AuthorizationException('You are not allowed to create client users.');
        }

        $user = User::query()->create([
            'name' => $attributes['name'],
            'email' => $attributes['email'],
            'password' => $attributes['password'],
            'email_verified_at' => now(),
        ]);

        $membership = ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $user->id,
            'role' => $attributes['role'],
            'created_by' => $actor->id,
        ]);

        $permissions = $membership->normalizedRole() === 'member'
            ? ClientPermissionCatalog::normalize($attributes['permissions'] ?? [])
            : [];

        foreach ($permissions as $permission) {
            $membership->permissions()->create([
                'permission_name' => $permission,
                'granted_by' => $actor->id,
            ]);
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.user.created',
            'source' => $source,
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'metadata_json' => [
                'client_id' => $client->id,
                'role' => $membership->role,
                'permissions' => $permissions,
            ],
            'after_json' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'client_id' => $client->id,
                'role' => $membership->role,
                'permissions' => $permissions,
            ],
        ]);

        return $membership->load(['user:id,name,email,email_verified_at', 'permissions']);
    }
}
