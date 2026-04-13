<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteClientMembership
{
    public function handle(User $actor, ClientMembership $membership, string $source = 'manual_ui'): void
    {
        if (! $actor->canManageMembers($membership->client)) {
            throw new AuthorizationException('You are not allowed to remove this client user.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.user.removed',
            'source' => $source,
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
        ]);

        $membership->delete();
    }
}
