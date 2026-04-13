<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\BoardMembership;
use App\Models\ClientMembership;
use App\Models\ProjectMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class UpdateClientMembership
{
    public function handle(User $actor, ClientMembership $membership, array $attributes, string $source = 'manual_ui'): ClientMembership
    {
        if (! $actor->canManageMembers($membership->client)) {
            throw new AuthorizationException('You are not allowed to update this client user.');
        }

        $before = [
            'name' => $membership->user->name,
            'email' => $membership->user->email,
            'role' => $membership->role,
            'permissions' => $membership->permissionNames(),
        ];

        DB::transaction(function () use ($membership, $attributes): void {
            $membership->user->forceFill([
                'name' => $attributes['name'],
                'email' => $attributes['email'],
            ])->save();

            $membership->forceFill([
                'role' => $attributes['role'],
            ])->save();

            if (! in_array($membership->normalizedRole(), ['owner', 'admin'], true)) {
                return;
            }

            $membership->permissions()->delete();

            ProjectMembership::query()
                ->where('user_id', $membership->user_id)
                ->whereHas('project', fn ($query) => $query->where('client_id', $membership->client_id))
                ->delete();

            BoardMembership::query()
                ->where('user_id', $membership->user_id)
                ->whereHas('board.project', fn ($query) => $query->where('client_id', $membership->client_id))
                ->delete();
        });

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.user.updated',
            'source' => $source,
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
            'before_json' => $before,
            'after_json' => [
                'name' => $membership->user->fresh()->name,
                'email' => $membership->user->fresh()->email,
                'role' => $membership->role,
                'permissions' => $membership->fresh('permissions')->permissionNames(),
            ],
        ]);

        return $membership->fresh(['user', 'permissions']);
    }
}
