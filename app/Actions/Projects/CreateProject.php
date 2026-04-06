<?php

namespace App\Actions\Projects;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class CreateProject
{
    public function handle(
        User $actor,
        Client $client,
        array $attributes,
        string $source = 'manual_ui',
    ): Project {
        if (! $actor->canManageClient($client)) {
            throw new AuthorizationException('You are not allowed to create projects for this client.');
        }

        $project = Project::query()->create([
            'client_id' => $client->id,
            'status_id' => $attributes['status_id'],
            'name' => $attributes['name'],
            'description' => $attributes['description'] ?? null,
            'starts_at' => $attributes['starts_at'] ?? null,
            'ends_at' => $attributes['ends_at'] ?? null,
            'notes' => $attributes['notes'] ?? null,
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'project.created',
            'source' => $source,
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'metadata_json' => [
                'name' => $project->name,
                'client_id' => $client->id,
                'status_id' => $project->status_id,
            ],
            'after_json' => [
                'id' => $project->id,
                'client_id' => $project->client_id,
                'status_id' => $project->status_id,
                'name' => $project->name,
                'description' => $project->description,
            ],
        ]);

        return $project->load(['client:id,name', 'status:id,name,slug']);
    }
}
