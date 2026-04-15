<?php

namespace App\Actions\Projects;

use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Project;
use App\Models\Skill;
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
            'markdown_description' => $attributes['markdown_description'] ?? null,
            'hosting' => $attributes['hosting'] ?? null,
            'starts_at' => $attributes['starts_at'] ?? null,
            'ends_at' => $attributes['ends_at'] ?? null,
            'notes' => $attributes['notes'] ?? null,
            'budget' => $attributes['budget'] ?? null,
            'currency' => $attributes['currency'] ?? 'USD',
        ]);

        if (array_key_exists('skills', $attributes)) {
            $project->skills()->sync(self::resolveSkillIds($attributes['skills'] ?? []));
        }

        if (array_key_exists('links', $attributes)) {
            self::syncLinks($project, $attributes['links'] ?? []);
        }

        if (array_key_exists('git_repos', $attributes)) {
            self::syncGitRepos($project, $attributes['git_repos'] ?? []);
        }

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

    /**
     * @param  array<int, int|string>  $values
     * @return array<int, int>
     */
    public static function resolveSkillIds(array $values): array
    {
        return collect($values)
            ->filter(fn ($value) => $value !== null && $value !== '')
            ->map(function ($value): int {
                if (is_int($value) || (is_string($value) && ctype_digit($value))) {
                    return (int) $value;
                }

                return Skill::firstOrCreate(['name' => trim((string) $value)])->id;
            })
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @param  array<int, array{label?: string|null, url: string}>  $links
     */
    public static function syncLinks(Project $project, array $links): void
    {
        $project->links()->delete();
        foreach (array_values($links) as $index => $link) {
            if (empty($link['url'])) {
                continue;
            }
            $project->links()->create([
                'label' => $link['label'] ?? null,
                'url' => $link['url'],
                'position' => $index,
            ]);
        }
    }

    /**
     * @param  array<int, array{name: string, repo_url: string, wakatime_badge_url?: string|null}>  $repos
     */
    public static function syncGitRepos(Project $project, array $repos): void
    {
        $project->gitRepos()->delete();
        foreach (array_values($repos) as $index => $repo) {
            if (empty($repo['name']) || empty($repo['repo_url'])) {
                continue;
            }
            $project->gitRepos()->create([
                'name' => $repo['name'],
                'repo_url' => $repo['repo_url'],
                'wakatime_badge_url' => $repo['wakatime_badge_url'] ?? null,
                'position' => $index,
            ]);
        }
    }
}
