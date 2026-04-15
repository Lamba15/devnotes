<?php

namespace Tests\Feature\Projects;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectGitRepo;
use App\Models\ProjectLink;
use App\Models\ProjectStatus;
use App\Models\Skill;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProjectExtensionsTest extends TestCase
{
    use RefreshDatabase;

    public function test_behaviors_seeded_include_five_normalized_labels(): void
    {
        $slugs = Behavior::query()->pluck('slug')->all();

        foreach (['normal', 'my-friend', 'nice-person', 'dont-like', 'formal-relations'] as $slug) {
            $this->assertContains($slug, $slugs, "Behavior slug [$slug] missing");
        }

        $this->assertSame('My Friend', Behavior::query()->where('slug', 'my-friend')->value('name'));
    }

    public function test_skills_seed_contains_default_entries(): void
    {
        $this->assertGreaterThanOrEqual(15, Skill::query()->count());
        $this->assertDatabaseHas('skills', ['slug' => 'laravel']);
    }

    public function test_creating_project_persists_markdown_description_and_hosting(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Prod test',
                'status_id' => $status->id,
                'description' => 'Short summary',
                'markdown_description' => "# Heading\n\nLong markdown body.",
                'hosting' => 'Hostinger',
            ])
            ->assertRedirect();

        $project = Project::query()->where('name', 'Prod test')->firstOrFail();

        $this->assertSame('Short summary', $project->description);
        $this->assertSame("# Heading\n\nLong markdown body.", $project->markdown_description);
        $this->assertSame('Hostinger', $project->hosting);
    }

    public function test_creating_project_with_mixed_skill_ids_and_new_names(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $existing = Skill::query()->where('slug', 'laravel')->firstOrFail();

        $response = $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Skill test',
                'status_id' => $status->id,
                'skills' => [$existing->id, 'BrandNewSkill'],
            ]);
        $response->assertRedirect();

        $project = Project::query()->where('name', 'Skill test')->firstOrFail();
        $skills = $project->skills()->orderBy('name')->pluck('name')->all();

        $this->assertContains('Laravel', $skills);
        $this->assertContains('BrandNewSkill', $skills);

        $new = Skill::query()->where('name', 'BrandNewSkill')->firstOrFail();
        $this->assertSame('brandnewskill', $new->slug);
    }

    public function test_creating_project_persists_links_and_git_repos(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Links and repos',
                'status_id' => $status->id,
                'links' => [
                    ['label' => 'Docs', 'url' => 'https://example.com/docs'],
                    ['label' => null, 'url' => 'https://example.com/api'],
                ],
                'git_repos' => [
                    [
                        'name' => 'core',
                        'repo_url' => 'https://github.com/acme/core',
                        'wakatime_badge_url' => 'https://wakatime.com/badge/acme-core',
                    ],
                ],
            ])
            ->assertRedirect();

        $project = Project::query()->where('name', 'Links and repos')->firstOrFail();

        $this->assertSame(2, $project->links()->count());
        $this->assertSame('Docs', $project->links()->orderBy('position')->first()->label);
        $this->assertSame(1, $project->gitRepos()->count());
        $this->assertSame('core', $project->gitRepos()->first()->name);
        $this->assertSame('https://wakatime.com/badge/acme-core', $project->gitRepos()->first()->wakatime_badge_url);
    }

    public function test_updating_project_syncs_skills_links_and_git_repos(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
        ]);

        $keepRepo = ProjectGitRepo::query()->create([
            'project_id' => $project->id,
            'name' => 'old',
            'repo_url' => 'https://github.com/acme/old',
            'position' => 0,
        ]);

        $removeLink = ProjectLink::query()->create([
            'project_id' => $project->id,
            'label' => 'Old',
            'url' => 'https://example.com/old',
            'position' => 0,
        ]);

        $this->actingAs($user)
            ->put(route('clients.projects.update', [$client, $project]), [
                'name' => $project->name,
                'status_id' => $status->id,
                'links' => [
                    ['label' => 'New', 'url' => 'https://example.com/new'],
                ],
                'git_repos' => [
                    ['name' => 'new-repo', 'repo_url' => 'https://github.com/acme/new-repo'],
                ],
                'skills' => ['FreshTech'],
            ])
            ->assertRedirect();

        $this->assertDatabaseMissing('project_links', ['id' => $removeLink->id]);
        $this->assertDatabaseMissing('project_git_repos', ['id' => $keepRepo->id]);
        $this->assertDatabaseHas('project_links', [
            'project_id' => $project->id,
            'label' => 'New',
            'url' => 'https://example.com/new',
        ]);
        $this->assertDatabaseHas('project_git_repos', [
            'project_id' => $project->id,
            'name' => 'new-repo',
        ]);
        $this->assertDatabaseHas('skills', ['name' => 'FreshTech']);
        $this->assertTrue($project->fresh()->skills()->where('name', 'FreshTech')->exists());
    }
}
