<?php

namespace Tests\Feature\Clients;

use App\Models\Behavior;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ClientManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_users_can_visit_the_clients_index(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('clients.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('clients/index'));
    }

    public function test_clients_require_a_name(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('clients.store'), [
                'behavior_id' => Behavior::query()->first()?->id,
            ])
            ->assertSessionHasErrors(['name']);
    }

    public function test_clients_default_to_normal_behavior(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('clients.store'), [
                'name' => 'Acme Corp',
            ])
            ->assertRedirect(route('clients.index'));

        $client = Client::query()->where('name', 'Acme Corp')->firstOrFail();

        $this->assertSame('normal', $client->behavior->slug);
    }

    public function test_manual_client_creation_is_audited(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('clients.store'), [
                'name' => 'Audited Client',
            ])
            ->assertRedirect(route('clients.index'));

        $client = Client::query()->where('name', 'Audited Client')->firstOrFail();

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'client.created',
            'source' => 'manual_ui',
            'subject_type' => Client::class,
            'subject_id' => $client->id,
        ]);
    }

    public function test_platform_owner_can_delete_clients_and_deletion_is_audited(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Delete Me',
        ]);

        $this->actingAs($user)
            ->delete(route('clients.destroy', $client))
            ->assertRedirect(route('clients.index'));

        $this->assertDatabaseMissing('clients', ['id' => $client->id]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'client.deleted',
            'source' => 'manual_ui',
            'subject_type' => Client::class,
            'subject_id' => $client->id,
        ]);
    }

    public function test_clients_index_supports_server_backed_search_and_sorting(): void
    {
        $user = User::factory()->create();

        Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Alpha Client',
        ]);
        Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Zulu Client',
        ]);

        $this->actingAs($user)
            ->get(route('clients.index', [
                'search' => 'client',
                'sort_by' => 'name',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('clients/index')
                ->where('clients.0.name', 'Zulu Client')
                ->where('clients.1.name', 'Alpha Client')
                ->where('filters.search', 'client')
                ->where('filters.sort_by', 'name')
                ->where('filters.sort_direction', 'desc')
            );
    }

    public function test_clients_index_includes_running_account_and_relationship_volume_for_accessible_finance(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Finance Client',
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $firstProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
        ]);
        $secondProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
        ]);

        Transaction::query()->create([
            'project_id' => $firstProject->id,
            'description' => 'Deposit',
            'amount' => 500,
            'currency' => 'EGP',
            'occurred_at' => '2026-04-12',
        ]);
        Transaction::query()->create([
            'project_id' => $secondProject->id,
            'description' => 'Expense',
            'amount' => -150,
            'currency' => 'EGP',
            'occurred_at' => '2026-04-12',
        ]);

        Invoice::query()->create([
            'project_id' => $firstProject->id,
            'reference' => 'INV-100',
            'status' => 'paid',
            'amount' => 1200,
            'currency' => 'EGP',
            'issued_at' => '2026-04-12',
        ]);
        Invoice::query()->create([
            'project_id' => $secondProject->id,
            'reference' => 'INV-101',
            'status' => 'paid',
            'amount' => 800,
            'currency' => 'EGP',
            'issued_at' => '2026-04-12',
        ]);

        $this->actingAs($user)
            ->get(route('clients.index', ['sort_by' => 'name', 'sort_direction' => 'asc']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('clients/index')
                ->where('clients.0.name', 'Finance Client')
                ->where('clients.0.can_view_finance_summary', true)
                ->where('clients.0.running_account.amount', 350)
                ->where('clients.0.running_account.currency', 'EGP')
                ->where('clients.0.running_account.mixed_currencies', false)
                ->where('clients.0.relationship_volume.amount', 2000)
                ->where('clients.0.relationship_volume.currency', 'EGP')
                ->where('clients.0.relationship_volume.mixed_currencies', false)
            );
    }

    public function test_clients_index_hides_finance_summary_for_members_without_finance_access(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Hidden Finance Client',
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $status->id,
            'budget' => 900,
            'currency' => 'EGP',
        ]);
        $member = User::factory()->create();

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        Transaction::query()->create([
            'project_id' => $project->id,
            'description' => 'Hidden amount',
            'amount' => 900,
            'currency' => 'EGP',
            'occurred_at' => '2026-04-12',
        ]);

        $this->actingAs($member)
            ->get(route('clients.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('clients/index')
                ->where('clients.0.name', 'Hidden Finance Client')
                ->where('clients.0.can_view_finance_summary', false)
                ->where('clients.0.running_account.amount', null)
                ->where('clients.0.relationship_volume.amount', null)
            );
    }

    public function test_clients_index_supports_sorting_by_running_account_and_relationship_volume(): void
    {
        $user = User::factory()->create();
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
        $lowClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Low Client',
        ]);
        $highClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'High Client',
        ]);

        $lowProject = Project::factory()->create([
            'client_id' => $lowClient->id,
            'status_id' => $status->id,
        ]);
        $highProject = Project::factory()->create([
            'client_id' => $highClient->id,
            'status_id' => $status->id,
        ]);

        Transaction::query()->create([
            'project_id' => $lowProject->id,
            'description' => 'Low transaction',
            'amount' => 100,
            'currency' => 'EGP',
            'occurred_at' => '2026-04-12',
        ]);
        Transaction::query()->create([
            'project_id' => $highProject->id,
            'description' => 'High transaction',
            'amount' => 600,
            'currency' => 'EGP',
            'occurred_at' => '2026-04-12',
        ]);

        Invoice::query()->create([
            'project_id' => $lowProject->id,
            'reference' => 'INV-LOW',
            'status' => 'paid',
            'amount' => 300,
            'currency' => 'EGP',
            'issued_at' => '2026-04-12',
        ]);
        Invoice::query()->create([
            'project_id' => $highProject->id,
            'reference' => 'INV-HIGH',
            'status' => 'paid',
            'amount' => 1400,
            'currency' => 'EGP',
            'issued_at' => '2026-04-12',
        ]);

        $this->actingAs($user)
            ->get(route('clients.index', [
                'sort_by' => 'running_account',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('clients/index')
                ->where('clients.0.name', 'High Client')
                ->where('clients.1.name', 'Low Client')
                ->where('filters.sort_by', 'running_account')
            );

        $this->actingAs($user)
            ->get(route('clients.index', [
                'sort_by' => 'relationship_volume',
                'sort_direction' => 'desc',
            ]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('clients/index')
                ->where('clients.0.name', 'High Client')
                ->where('clients.1.name', 'Low Client')
                ->where('filters.sort_by', 'relationship_volume')
            );
    }
}
