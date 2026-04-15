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

        $project->fill(Arr::only($attributes, [
            'status_id',
            'name',
            'description',
            'markdown_description',
            'hosting',
            'starts_at',
            'ends_at',
            'notes',
            'budget',
            'currency',
        ]));
        $project->save();

        if (array_key_exists('skills', $attributes)) {
            $project->skills()->sync(CreateProject::resolveSkillIds($attributes['skills'] ?? []));
        }

        if (array_key_exists('links', $attributes)) {
            CreateProject::syncLinks($project, $attributes['links'] ?? []);
        }

        if (array_key_exists('git_repos', $attributes)) {
            CreateProject::syncGitRepos($project, $attributes['git_repos'] ?? []);
        }

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
