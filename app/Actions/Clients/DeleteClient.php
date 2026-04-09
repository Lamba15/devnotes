<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteClient
{
    public function handle(User $actor, Client $client, string $source = 'manual_ui'): void
    {
        if (! $actor->isPlatformOwner()) {
            throw new AuthorizationException('You are not allowed to delete clients.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.deleted',
            'source' => $source,
            'subject_type' => Client::class,
            'subject_id' => $client->id,
            'before_json' => [
                'name' => $client->name,
                'email' => $client->email,
            ],
        ]);

        $client->delete();
    }
}
