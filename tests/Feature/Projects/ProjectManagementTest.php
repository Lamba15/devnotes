<?php

namespace Tests\Feature\Projects;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
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

    public function test_projects_index_supports_status_filtering(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
        $archivedStatus = ProjectStatus::query()->where('slug', 'archived')->firstOrFail();

        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $activeStatus->id,
            'name' => 'Active Project',
        ]);
        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $archivedStatus->id,
            'name' => 'Archived Project',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.index', [
                'client' => $client,
                'status' => ['archived'],
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->has('projects', 1)
                ->where('projects.0.name', 'Archived Project')
                ->where('filters.status', ['archived'])
                ->has('status_filter_options')
            );
    }

    public function test_projects_index_includes_project_finance_summaries(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Finance Project',
        ]);

        Transaction::query()->create([
            'project_id' => $project->id,
            'description' => 'Deposit',
            'amount' => 1000,
            'currency' => 'EGP',
            'occurred_date' => '2026-04-01',
        ]);

        Invoice::query()->create([
            'project_id' => $project->id,
            'reference' => 'INV-PROJECT-001',
            'status' => 'pending',
            'amount' => 1600,
            'currency' => 'EGP',
            'issued_at' => '2026-04-02',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.index', $client))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->where('projects.0.name', 'Finance Project')
                ->where('projects.0.running_account.amount', -600)
                ->where('projects.0.running_account.currency', 'EGP')
                ->where('projects.0.relationship_volume.amount', 1600)
                ->where('projects.0.relationship_volume.currency', 'EGP')
                ->where('projects.0.can_view_finance_summary', true)
            );
    }

    public function test_projects_index_supports_finance_sorting(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $highBalanceProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
            'name' => 'High Balance Project',
        ]);
        $lowBalanceProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
            'name' => 'Low Balance Project',
        ]);

        Transaction::query()->create([
            'project_id' => $highBalanceProject->id,
            'description' => 'Large deposit',
            'amount' => 3000,
            'currency' => 'EGP',
            'occurred_date' => '2026-04-01',
        ]);
        Invoice::query()->create([
            'project_id' => $highBalanceProject->id,
            'reference' => 'INV-HIGH-001',
            'status' => 'pending',
            'amount' => 1000,
            'currency' => 'EGP',
            'issued_at' => '2026-04-02',
        ]);

        Transaction::query()->create([
            'project_id' => $lowBalanceProject->id,
            'description' => 'Small deposit',
            'amount' => 400,
            'currency' => 'EGP',
            'occurred_date' => '2026-04-01',
        ]);
        Invoice::query()->create([
            'project_id' => $lowBalanceProject->id,
            'reference' => 'INV-LOW-001',
            'status' => 'pending',
            'amount' => 2000,
            'currency' => 'EGP',
            'issued_at' => '2026-04-02',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.index', [
                'client' => $client,
                'sort_by' => 'running_account',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->where('projects.0.name', 'High Balance Project')
                ->where('projects.1.name', 'Low Balance Project')
                ->where('filters.sort_by', 'running_account')
                ->where('filters.sort_direction', 'desc')
                ->where('can_sort_finance_summary', true)
            );

        $this->actingAs($user)
            ->get(route('clients.projects.index', [
                'client' => $client,
                'sort_by' => 'relationship_volume',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/index')
                ->where('projects.0.name', 'Low Balance Project')
                ->where('projects.1.name', 'High Balance Project')
                ->where('filters.sort_by', 'relationship_volume')
            );
    }

    public function test_platform_owner_can_visit_the_cross_client_projects_index(): void
    {
        $user = User::factory()->create();
        $firstClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Alpha Client',
        ]);
        $secondClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Zulu Client',
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        Project::factory()->create([
            'client_id' => $firstClient->id,
            'status_id' => $status->id,
            'name' => 'First Client Project',
        ]);
        Project::factory()->create([
            'client_id' => $secondClient->id,
            'status_id' => $status->id,
            'name' => 'Second Client Project',
        ]);

        $this->actingAs($user)
            ->get(route('clients.projects.all', [
                'search' => 'client',
                'sort_by' => 'client_name',
                'sort_direction' => 'asc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('projects/all')
                ->has('projects', 2)
                ->where('projects.0.client.name', 'Alpha Client')
                ->where('projects.1.client.name', 'Zulu Client')
                ->where('filters.search', 'client')
                ->where('filters.sort_by', 'client_name')
                ->where('filters.sort_direction', 'asc')
            );
    }

    public function test_project_logo_can_be_uploaded_and_removed(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);

        $this->actingAs($user)
            ->post(route('clients.projects.image.upload', [$client, $project]), [
                'image' => UploadedFile::fake()->createWithContent(
                    'logo.png',
                    base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sZrxh0AAAAASUVORK5CYII='),
                ),
            ])
            ->assertRedirect();

        $project->refresh();

        $this->assertNotNull($project->image_path);
        Storage::disk('public')->assertExists($project->image_path);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'project.image_uploaded',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);

        $storedPath = $project->image_path;

        $this->actingAs($user)
            ->delete(route('clients.projects.image.remove', [$client, $project]))
            ->assertRedirect();

        $project->refresh();

        $this->assertNull($project->image_path);
        Storage::disk('public')->assertMissing($storedPath);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'project.image_removed',
            'subject_type' => Project::class,
            'subject_id' => $project->id,
        ]);
    }
}
