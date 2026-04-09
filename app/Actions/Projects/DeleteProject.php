<?php

namespace App\Actions\Projects;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteProject
{
    public function handle(User $actor, Project $project, string $source = 'manual_ui'): void
    {
        if (! $actor->canManageClient($project->client)) {
            throw new AuthorizationException('You are not allowed to delete this project.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'project.deleted',
            'source' => $source,
            'subject_type' => Project::class,
            'subject_id' => $project->id,
            'before_json' => [
                'name' => $project->name,
                'description' => $project->description,
                'status_id' => $project->status_id,
            ],
        ]);

        $project->delete();
    }
}
