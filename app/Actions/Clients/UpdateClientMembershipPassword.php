<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateClientMembershipPassword
{
    public function handle(
        User $actor,
        ClientMembership $membership,
        string $password,
        string $source = 'manual_ui',
    ): void {
        if (! $actor->isPlatformOwner()) {
            throw new AuthorizationException('You are not allowed to change this user password.');
        }

        $membership->user->forceFill([
            'password' => $password,
        ])->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'user.password_changed_by_platform_owner',
            'source' => $source,
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
            'metadata_json' => [
                'client_id' => $membership->client_id,
                'membership_id' => $membership->id,
            ],
        ]);
    }
}
