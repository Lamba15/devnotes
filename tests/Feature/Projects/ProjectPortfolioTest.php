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

class ProjectPortfolioTest extends TestCase
{
    use RefreshDatabase;

    public function test_portfolio_categories_constant_lists_expected_values(): void
    {
        $this->assertSame(['ai', 'education', 'business', 'erp', 'creative'], Project::PORTFOLIO_CATEGORIES);
    }

    public function test_projects_have_sane_portfolio_defaults(): void
    {
        $project = Project::factory()->create();

        $project->refresh();

        $this->assertFalse($project->is_published);
        $this->assertFalse($project->is_featured);
        $this->assertSame(0, $project->sort_order);
        $this->assertNull($project->portfolio_category);
    }

    public function test_published_scope_returns_only_published_projects(): void
    {
        $published = Project::factory()->create(['is_published' => true]);
        Project::factory()->create(['is_published' => false]);

        $this->assertSame([$published->id], Project::query()->published()->pluck('id')->all());
    }

    public function test_creating_project_persists_portfolio_curation_fields(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Portfolio test',
                'status_id' => $status->id,
                'is_published' => true,
                'is_featured' => true,
                'sort_order' => 3,
                'portfolio_category' => 'ai',
            ])
            ->assertRedirect();

        $project = Project::query()->where('name', 'Portfolio test')->firstOrFail();

        $this->assertTrue($project->is_published);
        $this->assertTrue($project->is_featured);
        $this->assertSame(3, $project->sort_order);
        $this->assertSame('ai', $project->portfolio_category);
    }

    public function test_portfolio_category_validation_accepts_known_categories(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        foreach (Project::PORTFOLIO_CATEGORIES as $category) {
            $this->actingAs($user)
                ->post(route('clients.projects.store', $client), [
                    'name' => "Category {$category}",
                    'status_id' => $status->id,
                    'portfolio_category' => $category,
                ])
                ->assertSessionDoesntHaveErrors();

            $this->assertDatabaseHas('projects', [
                'name' => "Category {$category}",
                'portfolio_category' => $category,
            ]);
        }
    }

    public function test_portfolio_category_validation_rejects_unknown_values(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->actingAs($user)
            ->post(route('clients.projects.store', $client), [
                'name' => 'Bad category',
                'status_id' => $status->id,
                'portfolio_category' => 'gadgets',
            ])
            ->assertSessionHasErrors('portfolio_category');

        $this->assertDatabaseMissing('projects', ['name' => 'Bad category']);
    }

    public function test_updating_project_edits_portfolio_curation_fields(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
        ]);

        $this->actingAs($user)
            ->put(route('clients.projects.update', [$client, $project]), [
                'name' => $project->name,
                'status_id' => $status->id,
                'is_published' => true,
                'is_featured' => false,
                'sort_order' => 7,
                'portfolio_category' => 'erp',
            ])
            ->assertRedirect();

        $project->refresh();

        $this->assertTrue($project->is_published);
        $this->assertFalse($project->is_featured);
        $this->assertSame(7, $project->sort_order);
        $this->assertSame('erp', $project->portfolio_category);
    }

    public function test_edit_page_exposes_portfolio_curation_fields(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
            'is_published' => true,
            'is_featured' => true,
            'sort_order' => 4,
            'portfolio_category' => 'ai',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.edit', [$client, $project]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/edit')
                ->where('project.is_published', true)
                ->where('project.is_featured', true)
                ->where('project.sort_order', 4)
                ->where('project.portfolio_category', 'ai')
            );
    }

    public function test_show_page_exposes_portfolio_curation_fields(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create(['behavior_id' => Behavior::query()->firstOrFail()->id]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
            'is_published' => true,
            'sort_order' => 2,
            'portfolio_category' => 'education',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.show', [$client, $project]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/show')
                ->where('project.is_published', true)
                ->where('project.is_featured', false)
                ->where('project.sort_order', 2)
                ->where('project.portfolio_category', 'education')
            );
    }
}
