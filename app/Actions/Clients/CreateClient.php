<?php

namespace App\Actions\Clients;

use App\Models\AuditLog;
use App\Models\Behavior;
use App\Models\Client;
use App\Models\User;

class CreateClient
{
    public function handle(User $actor, array $attributes, string $source = 'manual_ui'): Client
    {
        $defaultBehaviorId = Behavior::query()
            ->where('slug', 'normal')
            ->value('id');

        $client = Client::query()->create([
            'name' => $attributes['name'],
            'behavior_id' => $attributes['behavior_id'] ?? $defaultBehaviorId,
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'client.created',
            'source' => $source,
            'subject_type' => Client::class,
            'subject_id' => $client->id,
            'metadata_json' => [
                'name' => $client->name,
                'behavior_id' => $client->behavior_id,
            ],
            'after_json' => [
                'id' => $client->id,
                'name' => $client->name,
                'behavior_id' => $client->behavior_id,
            ],
        ]);

        return $client->load('behavior:id,name,slug');
    }
}
