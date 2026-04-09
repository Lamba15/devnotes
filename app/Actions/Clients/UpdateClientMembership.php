<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateClientMembership
{
    public function handle(User $actor, ClientMembership $membership, array $attributes, string $source = 'manual_ui'): ClientMembership
    {
        if (! $actor->canManageClient($membership->client)) {
            throw new AuthorizationException('You are not allowed to update this client user.');
        }

        $membership->user->forceFill([
            'name' => $attributes['name'],
            'email' => $attributes['email'],
        ])->save();

        $membership->forceFill([
            'role' => $attributes['role'],
        ])->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.user.updated',
            'source' => $source,
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
        ]);

        return $membership->fresh(['user']);
    }
}
