<?php

namespace Tests\Feature\Clients;

use App\Models\Behavior;
use App\Models\Client;
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
}
