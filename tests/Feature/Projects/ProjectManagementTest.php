<?php

namespace Tests\Feature\Projects;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ProjectManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_projects_are_nested_under_clients(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.index', $client))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('projects/index'));
    }

    public function test_projects_require_a_client_and_status(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Website rebuild',
            ])
            ->assertSessionHasErrors(['status_id']);
    }

    public function test_projects_belong_to_exactly_one_client(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Website rebuild',
                'status_id' => $status->id,
            ])
            ->assertRedirect(route('clients.projects.index', $client));

        $project = Project::query()->where('name', 'Website rebuild')->firstOrFail();

        $this->assertSame($client->id, $project->client_id);
    }

    public function test_manual_project_creation_is_audited(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Audited project',
                'status_id' => $status->id,
            ])
            ->assertRedirect(route('clients.projects.index', $client));

        $project = Project::query()->where('name', 'Audited project')->firstOrFail();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'project.created',
            'source' => 'manual_ui',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);
    }

    public function test_client_admins_can_delete_projects_and_deletion_is_audited(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Delete Me Project',
        ]);

        $this->actingAs($user)
            ->delete(route('clients.projects.destroy', [$client, $project]))
            ->assertRedirect(route('clients.projects.index', $client));

        $this->assertDatabaseMissing('projects', ['id' => $project->id]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'project.deleted',
            'source' => 'manual_ui',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);
    }

    public function test_projects_index_supports_server_backed_search_and_sorting(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);

        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Alpha Project',
        ]);
        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Zulu Project',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.index', [
                'client' => $client,
                'search' => 'project',
                'sort_by' => 'name',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->where('projects.0.name', 'Zulu Project')
                ->where('projects.1.name', 'Alpha Project')
                ->where('filters.search', 'project')
                ->where('filters.sort_by', 'name')
                ->where('filters.sort_direction', 'desc')
            );
    }
}
