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
}
