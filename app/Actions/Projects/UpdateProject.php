<?php

namespace App\Actions\Projects;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Arr;

class UpdateProject
{
    public function handle(User $actor, Project $project, array $attributes, string $source = 'manual_ui'): Project
    {
        if (! $actor->canManageClient($project->client)) {
            throw new AuthorizationException('You are not allowed to update projects for this client.');
        }

        $project->fill(Arr::only($attributes, ['status_id', 'name', 'description', 'starts_at', 'ends_at', 'notes']));
        $project->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'project.updated',
            'source' => $source,
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'metadata_json' => [
                'client_id' => $project->client_id,
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
