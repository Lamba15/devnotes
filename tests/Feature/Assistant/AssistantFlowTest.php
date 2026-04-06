<?php

namespace Tests\Feature\Assistant;

use App\AI\Contracts\AssistantModelClient;
use App\Models\AssistantActionConfirmation;
use App\Models\AssistantThread;
use App\Models\Behavior;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AssistantFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_read_only_assistant_responses_are_returned_immediately(): void
    {
        $user = User::factory()->create();

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'You have no clients yet.',
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'What clients do I have?',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.role', 'assistant')
            ->assertJsonPath('data.messages.1.content', 'You have no clients yet.');

        $this->assertDatabaseCount('assistant_threads', 1);
        $this->assertDatabaseCount('assistant_messages', 2);
    }

    public function test_mutating_tool_calls_create_pending_confirmations(): void
    {
        $user = User::factory()->create();

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can create that client once you confirm.',
            'tool_calls' => [[
                'id' => 'call_1',
                'name' => 'create_client',
                'arguments' => ['name' => 'Acme via AI'],
            ]],
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'Create a client called Acme via AI',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'create_client')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('clients', ['name' => 'Acme via AI']);
        $this->assertDatabaseHas('assistant_action_confirmations', [
            'tool_name' => 'create_client',
            'status' => 'pending',
        ]);
    }

    public function test_read_only_tool_calls_are_executed_without_confirmation(): void
    {
        $user = User::factory()->create();
        $behavior = Behavior::query()->firstOrFail();

        Client::factory()->create([
            'name' => 'Acme',
            'behavior_id' => $behavior->id,
        ]);

        Client::factory()->create([
            'name' => 'Globex',
            'behavior_id' => $behavior->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the clients I can access.',
            'tool_calls' => [[
                'id' => 'call_2',
                'name' => 'list_accessible_clients',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'List my clients',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'client_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Globex')
            ->assertJsonPath('data.messages.1.tool_results.0.items.1.name', 'Acme');

        $this->assertDatabaseCount('assistant_action_confirmations', 0);
    }

    public function test_client_list_tool_supports_search_and_sorting(): void
    {
        $user = User::factory()->create();
        $behavior = Behavior::query()->firstOrFail();

        Client::factory()->create([
            'name' => 'Acme Partners',
            'behavior_id' => $behavior->id,
        ]);
        Client::factory()->create([
            'name' => 'Ammar Holdings',
            'behavior_id' => $behavior->id,
        ]);
        Client::factory()->create([
            'name' => 'Zeta Group',
            'behavior_id' => $behavior->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the matching clients.',
            'tool_calls' => [[
                'id' => 'call_clients_filtered',
                'name' => 'list_accessible_clients',
                'arguments' => [
                    'search' => 'am',
                    'limit' => 2,
                    'sort_by' => 'name',
                    'sort_direction' => 'asc',
                ],
            ]],
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'List clients matching am sorted by name',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Acme Partners')
            ->assertJsonPath('data.messages.1.tool_results.0.items.1.name', 'Ammar Holdings');

        $this->assertCount(2, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_approved_assistant_confirmations_execute_the_tool(): void
    {
        $user = User::factory()->create();
        $thread = AssistantThread::query()->create(['user_id' => $user->id]);
        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'tool_name' => 'create_client',
            'payload_json' => ['name' => 'Approved AI Client'],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed');

        $this->assertDatabaseHas('clients', ['name' => 'Approved AI Client']);
        $this->assertDatabaseHas('assistant_action_confirmations', [
            'id' => $confirmation->id,
            'status' => 'executed',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'client.created',
            'source' => 'ai_assistant',
            'subject_type' => Client::class,
        ]);
    }

    public function test_rejected_assistant_confirmations_do_not_execute_the_tool(): void
    {
        $user = User::factory()->create();
        $thread = AssistantThread::query()->create(['user_id' => $user->id]);
        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'tool_name' => 'create_client',
            'payload_json' => ['name' => 'Rejected AI Client'],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson(route('assistant.confirmations.reject', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'rejected');

        $this->assertDatabaseMissing('clients', ['name' => 'Rejected AI Client']);
    }

    public function test_project_read_tools_only_return_projects_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Allowed Project',
        ]);
        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Hidden Project',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $allowedProject->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the projects you can access.',
            'tool_calls' => [[
                'id' => 'call_projects_1',
                'name' => 'list_accessible_projects',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'List my projects',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'project_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Allowed Project');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_project_list_tool_supports_client_filter_search_and_sorting(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Ammar',
        ]);
        $otherClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
            'name' => 'Other Client',
        ]);
        $member = User::factory()->create();
        $activeStatus = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $alpha = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $activeStatus->id,
            'name' => 'Alpha Search Project',
        ]);
        Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => $activeStatus->id,
            'name' => 'Zulu Search Project',
        ]);
        Project::factory()->create([
            'client_id' => $otherClient->id,
            'status_id' => $activeStatus->id,
            'name' => 'Alpha Other Client Project',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);
        ProjectMembership::query()->create([
            'project_id' => $alpha->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the matching projects.',
            'tool_calls' => [[
                'id' => 'call_projects_filtered',
                'name' => 'list_accessible_projects',
                'arguments' => [
                    'client_id' => $client->id,
                    'search' => 'alpha',
                    'sort_by' => 'name',
                    'sort_direction' => 'asc',
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'List Ammar projects matching alpha',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Alpha Search Project');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_project_mutation_tool_calls_create_pending_confirmations(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can create that project once you confirm.',
            'tool_calls' => [[
                'id' => 'call_project_create',
                'name' => 'create_project',
                'arguments' => [
                    'client_id' => $client->id,
                    'status_id' => $status->id,
                    'name' => 'AI Project',
                ],
            ]],
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'Create a new project',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'create_project')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('projects', ['name' => 'AI Project']);
    }

    public function test_approved_project_confirmations_execute_the_tool(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $status = ProjectStatus::query()->where('slug', 'active')->firstOrFail();
        $thread = AssistantThread::query()->create(['user_id' => $user->id]);
        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'tool_name' => 'create_project',
            'payload_json' => [
                'client_id' => $client->id,
                'status_id' => $status->id,
                'name' => 'Approved AI Project',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed');

        $this->assertDatabaseHas('projects', [
            'client_id' => $client->id,
            'status_id' => $status->id,
            'name' => 'Approved AI Project',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'project.created',
            'source' => 'ai_assistant',
            'subject_type' => Project::class,
        ]);
    }

    public function test_finance_read_tools_only_return_transactions_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $admin = User::factory()->create();
        $otherClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Managed Project',
        ]);
        $blockedProject = Project::factory()->create([
            'client_id' => $otherClient->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Blocked Project',
        ]);

        Transaction::query()->create([
            'project_id' => $allowedProject->id,
            'description' => 'Allowed Transaction',
            'amount' => 1200,
            'occurred_at' => '2026-04-05',
        ]);

        Transaction::query()->create([
            'project_id' => $blockedProject->id,
            'description' => 'Blocked Transaction',
            'amount' => 900,
            'occurred_at' => '2026-04-05',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the transactions I can access.',
            'tool_calls' => [[
                'id' => 'call_transactions_1',
                'name' => 'list_accessible_transactions',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($admin)->postJson(route('assistant.messages.store'), [
            'message' => 'List my transactions',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'transaction_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.description', 'Allowed Transaction');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_viewers_cannot_access_finance_mutation_tools(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to create a transaction.',
            'tool_calls' => [[
                'id' => 'call_transaction_create',
                'name' => 'create_transaction',
                'arguments' => [
                    'project_id' => $project->id,
                    'description' => 'Forbidden Transaction',
                    'amount' => '500.00',
                    'occurred_at' => '2026-04-05',
                ],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'Create a transaction',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');

        $this->assertDatabaseMissing('transactions', [
            'description' => 'Forbidden Transaction',
        ]);
        $this->assertDatabaseCount('assistant_action_confirmations', 0);
    }

    public function test_finance_read_tools_only_return_invoices_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $admin = User::factory()->create();
        $otherClient = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Managed Billing Project',
        ]);
        $blockedProject = Project::factory()->create([
            'client_id' => $otherClient->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Blocked Billing Project',
        ]);

        Invoice::query()->create([
            'project_id' => $allowedProject->id,
            'reference' => 'INV-ALLOWED',
            'status' => 'sent',
            'amount' => 2400,
            'issued_at' => '2026-04-05',
        ]);

        Invoice::query()->create([
            'project_id' => $blockedProject->id,
            'reference' => 'INV-BLOCKED',
            'status' => 'sent',
            'amount' => 1300,
            'issued_at' => '2026-04-05',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the invoices I can access.',
            'tool_calls' => [[
                'id' => 'call_invoices_1',
                'name' => 'list_accessible_invoices',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($admin)->postJson(route('assistant.messages.store'), [
            'message' => 'List my invoices',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'invoice_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.reference', 'INV-ALLOWED');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_invoice_mutation_tool_calls_create_pending_confirmations(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can create that invoice once you confirm.',
            'tool_calls' => [[
                'id' => 'call_invoice_create',
                'name' => 'create_invoice',
                'arguments' => [
                    'project_id' => $project->id,
                    'reference' => 'INV-AI-001',
                    'status' => 'draft',
                    'amount' => '5000.00',
                    'issued_at' => '2026-04-05',
                ],
            ]],
        ]));

        $response = $this->actingAs($user)->postJson(route('assistant.messages.store'), [
            'message' => 'Create invoice INV-AI-001',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'create_invoice')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('invoices', ['reference' => 'INV-AI-001']);
    }

    public function test_approved_invoice_confirmations_execute_the_tool(): void
    {
        $user = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $user->id]);
        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $user->id,
            'tool_name' => 'create_invoice',
            'payload_json' => [
                'project_id' => $project->id,
                'reference' => 'INV-AI-APPROVED',
                'status' => 'draft',
                'amount' => '6500.00',
                'issued_at' => '2026-04-05',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($user)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed');

        $this->assertDatabaseHas('invoices', [
            'project_id' => $project->id,
            'reference' => 'INV-AI-APPROVED',
            'status' => 'draft',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $user->id,
            'event' => 'invoice.created',
            'source' => 'ai_assistant',
            'subject_type' => Invoice::class,
        ]);
    }

    public function test_issue_read_tools_only_return_issues_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();
        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $blockedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $allowedProject->id,
            'user_id' => $viewer->id,
        ]);

        Issue::query()->create([
            'project_id' => $allowedProject->id,
            'title' => 'Allowed issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $viewer->id,
        ]);

        Issue::query()->create([
            'project_id' => $blockedProject->id,
            'title' => 'Blocked issue',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'creator_id' => User::factory()->create()->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the issues I can access.',
            'tool_calls' => [[
                'id' => 'call_issues_1',
                'name' => 'list_accessible_issues',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'List my issues',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'issue_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.title', 'Allowed issue');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_issue_list_tool_supports_project_filter_search_and_sorting(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);
        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $viewer->id,
        ]);

        Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Alpha bug',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'creator_id' => $viewer->id,
        ]);
        Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Beta task',
            'status' => 'todo',
            'priority' => 'low',
            'type' => 'task',
            'creator_id' => $viewer->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the matching issues.',
            'tool_calls' => [[
                'id' => 'call_issues_filtered',
                'name' => 'list_accessible_issues',
                'arguments' => [
                    'project_id' => $project->id,
                    'search' => 'a',
                    'sort_by' => 'title',
                    'sort_direction' => 'desc',
                ],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'List issues in this project',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.title', 'Beta task')
            ->assertJsonPath('data.messages.1.tool_results.0.items.1.title', 'Alpha bug');
    }

    public function test_issue_discussion_read_tool_returns_threaded_comments_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Discussed issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $rootComment = IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => $member->id,
            'body' => 'Root discussion comment',
        ]);

        IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => User::factory()->create()->id,
            'parent_id' => $rootComment->id,
            'body' => 'Nested discussion reply',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here is the issue discussion.',
            'tool_calls' => [[
                'id' => 'call_issue_discussion_1',
                'name' => 'get_issue_discussion',
                'arguments' => [
                    'issue_id' => $issue->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the discussion for that issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'issue_discussion')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.title', 'Discussed issue')
            ->assertJsonPath('data.messages.1.tool_results.0.comments.0.body', 'Root discussion comment')
            ->assertJsonPath('data.messages.1.tool_results.0.comments.0.replies.0.body', 'Nested discussion reply');
    }

    public function test_issue_discussion_read_tool_returns_error_for_issue_outside_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $blockedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $blockedIssue = Issue::query()->create([
            'project_id' => $blockedProject->id,
            'title' => 'Blocked discussion issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => User::factory()->create()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $allowedProject->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to inspect that issue discussion.',
            'tool_calls' => [[
                'id' => 'call_issue_discussion_forbidden',
                'name' => 'get_issue_discussion',
                'arguments' => [
                    'issue_id' => $blockedIssue->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the blocked issue discussion',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');
    }

    public function test_issue_detail_read_tool_returns_issue_fields_and_threaded_comments_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $assignee = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Detail Project',
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Detailed issue',
            'description' => 'Issue detail description',
            'status' => 'in_progress',
            'priority' => 'high',
            'type' => 'bug',
            'assignee_id' => $assignee->id,
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $rootComment = IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => $member->id,
            'body' => 'Detail root comment',
        ]);

        IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => $assignee->id,
            'parent_id' => $rootComment->id,
            'body' => 'Detail nested reply',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here is the issue detail.',
            'tool_calls' => [[
                'id' => 'call_issue_detail_1',
                'name' => 'get_issue_detail',
                'arguments' => [
                    'issue_id' => $issue->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the full issue detail',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'issue_detail')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.title', 'Detailed issue')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.description', 'Issue detail description')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.status', 'in_progress')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.priority', 'high')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.type', 'bug')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.project.name', 'Detail Project')
            ->assertJsonPath('data.messages.1.tool_results.0.issue.assignee.id', $assignee->id)
            ->assertJsonPath('data.messages.1.tool_results.0.comments.0.body', 'Detail root comment')
            ->assertJsonPath('data.messages.1.tool_results.0.comments.0.replies.0.body', 'Detail nested reply');
    }

    public function test_issue_detail_read_tool_returns_error_for_issue_outside_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $allowedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $blockedProject = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $blockedIssue = Issue::query()->create([
            'project_id' => $blockedProject->id,
            'title' => 'Blocked detail issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => User::factory()->create()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $allowedProject->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to inspect that issue detail.',
            'tool_calls' => [[
                'id' => 'call_issue_detail_forbidden',
                'name' => 'get_issue_detail',
                'arguments' => [
                    'issue_id' => $blockedIssue->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the blocked issue detail',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');
    }

    public function test_board_context_read_tool_returns_backlog_and_columns_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Assistant Delivery Board',
        ]);
        $column = BoardColumn::query()->create([
            'board_id' => $board->id,
            'name' => 'Doing',
            'position' => 1,
            'updates_status' => false,
        ]);
        $backlogIssue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Backlog board issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => User::factory()->create()->id,
        ]);
        $placedIssue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Placed board issue',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'creator_id' => User::factory()->create()->id,
        ]);

        BoardIssuePlacement::query()->create([
            'board_id' => $board->id,
            'issue_id' => $placedIssue->id,
            'column_id' => $column->id,
            'position' => 1,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        BoardMembership::query()->create([
            'board_id' => $board->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here is the board context.',
            'tool_calls' => [[
                'id' => 'call_board_context_1',
                'name' => 'get_board_context',
                'arguments' => [
                    'board_id' => $board->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the board context',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'board_context')
            ->assertJsonPath('data.messages.1.tool_results.0.board.name', 'Assistant Delivery Board')
            ->assertJsonPath('data.messages.1.tool_results.0.backlog.0.title', 'Backlog board issue')
            ->assertJsonPath('data.messages.1.tool_results.0.columns.0.name', 'Doing')
            ->assertJsonPath('data.messages.1.tool_results.0.columns.0.issues.0.title', 'Placed board issue');
    }

    public function test_board_context_read_tool_returns_error_for_board_outside_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Restricted Assistant Board',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to inspect that board.',
            'tool_calls' => [[
                'id' => 'call_board_context_forbidden',
                'name' => 'get_board_context',
                'arguments' => [
                    'board_id' => $board->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Show me the restricted board context',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');
    }

    public function test_board_list_read_tool_only_returns_boards_in_user_scope(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Board List Project',
        ]);
        $allowedBoard = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Allowed board',
        ]);
        $blockedBoard = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Blocked board',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        BoardMembership::query()->create([
            'board_id' => $allowedBoard->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the boards I can access.',
            'tool_calls' => [[
                'id' => 'call_board_list_1',
                'name' => 'list_accessible_boards',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'List my boards',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'board_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Allowed board');

        $this->assertCount(1, $response->json('data.messages.1.tool_results.0.items'));
    }

    public function test_board_list_read_tool_returns_viewer_accessible_boards(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Viewer Board Project',
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Viewer visible board',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $viewer->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the viewer boards.',
            'tool_calls' => [[
                'id' => 'call_board_list_viewer',
                'name' => 'list_accessible_boards',
                'arguments' => [],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'List viewer boards',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'board_list')
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Viewer visible board');
    }

    public function test_board_list_tool_supports_project_filter_search_and_sorting(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $alphaBoard = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Alpha Board',
        ]);
        $zuluBoard = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Zulu Board',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);
        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);
        BoardMembership::query()->create([
            'board_id' => $alphaBoard->id,
            'user_id' => $member->id,
        ]);
        BoardMembership::query()->create([
            'board_id' => $zuluBoard->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here are the matching boards.',
            'tool_calls' => [[
                'id' => 'call_boards_filtered',
                'name' => 'list_accessible_boards',
                'arguments' => [
                    'project_id' => $project->id,
                    'search' => 'board',
                    'sort_by' => 'name',
                    'sort_direction' => 'desc',
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'List my boards sorted by name desc',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.name', 'Zulu Board')
            ->assertJsonPath('data.messages.1.tool_results.0.items.1.name', 'Alpha Board');
    }

    public function test_finance_list_tools_support_filters_search_and_sorting(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $admin = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
            'name' => 'Finance Project',
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        Transaction::query()->create([
            'project_id' => $project->id,
            'description' => 'Alpha deposit',
            'amount' => 100,
            'occurred_at' => '2026-04-01',
        ]);
        Transaction::query()->create([
            'project_id' => $project->id,
            'description' => 'Zulu deposit',
            'amount' => 200,
            'occurred_at' => '2026-04-02',
        ]);

        Invoice::query()->create([
            'project_id' => $project->id,
            'reference' => 'INV-200',
            'status' => 'sent',
            'amount' => 200,
        ]);
        Invoice::query()->create([
            'project_id' => $project->id,
            'reference' => 'INV-100',
            'status' => 'draft',
            'amount' => 100,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'Here is the filtered finance data.',
            'tool_calls' => [
                [
                    'id' => 'call_transactions_filtered',
                    'name' => 'list_accessible_transactions',
                    'arguments' => [
                        'project_id' => $project->id,
                        'search' => 'deposit',
                        'sort_by' => 'description',
                        'sort_direction' => 'desc',
                    ],
                ],
                [
                    'id' => 'call_invoices_filtered',
                    'name' => 'list_accessible_invoices',
                    'arguments' => [
                        'project_id' => $project->id,
                        'sort_by' => 'reference',
                        'sort_direction' => 'asc',
                    ],
                ],
            ],
        ]));

        $response = $this->actingAs($admin)->postJson(route('assistant.messages.store'), [
            'message' => 'List project finance',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.messages.1.tool_results.0.items.0.description', 'Zulu deposit')
            ->assertJsonPath('data.messages.1.tool_results.0.items.1.description', 'Alpha deposit')
            ->assertJsonPath('data.messages.1.tool_results.1.items.0.reference', 'INV-100')
            ->assertJsonPath('data.messages.1.tool_results.1.items.1.reference', 'INV-200');
    }

    public function test_board_issue_move_tool_calls_create_pending_confirmations(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Movable board',
        ]);
        $column = BoardColumn::query()->create([
            'board_id' => $board->id,
            'name' => 'Doing',
            'position' => 1,
            'updates_status' => true,
            'mapped_status' => 'in_progress',
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Board movable issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        BoardMembership::query()->create([
            'board_id' => $board->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can move that issue once you confirm.',
            'tool_calls' => [[
                'id' => 'call_board_move',
                'name' => 'move_issue_on_board',
                'arguments' => [
                    'board_id' => $board->id,
                    'issue_id' => $issue->id,
                    'column_id' => $column->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Move the issue on the board',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'move_issue_on_board')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('board_issue_placements', [
            'board_id' => $board->id,
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ]);
    }

    public function test_approved_board_issue_move_confirmations_execute_the_tool(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Approved move board',
        ]);
        $column = BoardColumn::query()->create([
            'board_id' => $board->id,
            'name' => 'Done',
            'position' => 1,
            'updates_status' => true,
            'mapped_status' => 'done',
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Approved board move issue',
            'status' => 'todo',
            'priority' => 'high',
            'type' => 'bug',
            'creator_id' => $member->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $member->id]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        BoardMembership::query()->create([
            'board_id' => $board->id,
            'user_id' => $member->id,
        ]);

        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $member->id,
            'tool_name' => 'move_issue_on_board',
            'payload_json' => [
                'board_id' => $board->id,
                'issue_id' => $issue->id,
                'column_id' => $column->id,
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($member)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed')
            ->assertJsonPath('data.result.type', 'board_issue_move')
            ->assertJsonPath('data.result.board.name', 'Approved move board')
            ->assertJsonPath('data.result.column.name', 'Done')
            ->assertJsonPath('data.result.issue.title', 'Approved board move issue');

        $this->assertDatabaseHas('board_issue_placements', [
            'board_id' => $board->id,
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $member->id,
            'event' => 'issue.moved_on_board',
            'source' => 'ai_assistant',
            'subject_type' => Issue::class,
        ]);

        expect($issue->fresh()->status)->toBe('done');
    }

    public function test_members_without_board_move_access_cannot_access_board_move_tools(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => 'Read only member board',
        ]);
        $column = BoardColumn::query()->create([
            'board_id' => $board->id,
            'name' => 'Doing',
            'position' => 1,
            'updates_status' => false,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Forbidden board move issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to move that issue.',
            'tool_calls' => [[
                'id' => 'call_board_move_forbidden',
                'name' => 'move_issue_on_board',
                'arguments' => [
                    'board_id' => $board->id,
                    'issue_id' => $issue->id,
                    'column_id' => $column->id,
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Move the board issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');

        $this->assertDatabaseMissing('board_issue_placements', [
            'board_id' => $board->id,
            'issue_id' => $issue->id,
            'column_id' => $column->id,
        ]);
        $this->assertDatabaseCount('assistant_action_confirmations', 0);
    }

    public function test_issue_create_tool_calls_create_pending_confirmations(): void
    {
        $admin = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can create that issue once you confirm.',
            'tool_calls' => [[
                'id' => 'call_issue_create',
                'name' => 'create_issue',
                'arguments' => [
                    'project_id' => $project->id,
                    'title' => 'AI Issue',
                    'status' => 'todo',
                    'priority' => 'high',
                    'type' => 'bug',
                ],
            ]],
        ]));

        $response = $this->actingAs($admin)->postJson(route('assistant.messages.store'), [
            'message' => 'Create issue AI Issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'create_issue')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('issues', ['title' => 'AI Issue']);
    }

    public function test_approved_issue_create_confirmations_execute_the_tool(): void
    {
        $admin = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $admin->id]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $admin->id,
            'tool_name' => 'create_issue',
            'payload_json' => [
                'project_id' => $project->id,
                'title' => 'Approved AI Issue',
                'status' => 'todo',
                'priority' => 'medium',
                'type' => 'task',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed');

        $this->assertDatabaseHas('issues', [
            'project_id' => $project->id,
            'title' => 'Approved AI Issue',
            'status' => 'todo',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'event' => 'issue.created',
            'source' => 'ai_assistant',
            'subject_type' => Issue::class,
        ]);
    }

    public function test_issue_update_tool_calls_create_pending_confirmations(): void
    {
        $admin = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Mutable issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $admin->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can update that issue once you confirm.',
            'tool_calls' => [[
                'id' => 'call_issue_update',
                'name' => 'update_issue',
                'arguments' => [
                    'issue_id' => $issue->id,
                    'title' => 'Updated by AI',
                    'status' => 'done',
                    'priority' => 'high',
                    'type' => 'bug',
                ],
            ]],
        ]));

        $response = $this->actingAs($admin)->postJson(route('assistant.messages.store'), [
            'message' => 'Update the issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'update_issue')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        expect($issue->fresh()->title)->toBe('Mutable issue');
    }

    public function test_approved_issue_update_confirmations_execute_the_tool(): void
    {
        $admin = User::factory()->create();
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Original AI issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $admin->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $admin->id]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $admin->id,
            'role' => 'admin',
        ]);

        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $admin->id,
            'tool_name' => 'update_issue',
            'payload_json' => [
                'issue_id' => $issue->id,
                'title' => 'AI updated issue',
                'status' => 'done',
                'priority' => 'high',
                'type' => 'bug',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed');

        expect($issue->fresh()->title)->toBe('AI updated issue');
        expect($issue->fresh()->status)->toBe('done');

        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $admin->id,
            'event' => 'issue.updated',
            'source' => 'ai_assistant',
            'subject_type' => Issue::class,
        ]);
    }

    public function test_issue_comment_tool_calls_create_pending_confirmations(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Commentable issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can add that comment once you confirm.',
            'tool_calls' => [[
                'id' => 'call_issue_comment_create',
                'name' => 'add_issue_comment',
                'arguments' => [
                    'issue_id' => $issue->id,
                    'body' => 'AI member comment',
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Add a comment to the issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'add_issue_comment')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('issue_comments', [
            'issue_id' => $issue->id,
            'body' => 'AI member comment',
        ]);
    }

    public function test_approved_issue_comment_confirmations_execute_the_tool(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Approval issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $member->id]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $member->id,
            'tool_name' => 'add_issue_comment',
            'payload_json' => [
                'issue_id' => $issue->id,
                'body' => 'Approved AI comment',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($member)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed')
            ->assertJsonPath('data.result.type', 'issue_comment')
            ->assertJsonPath('data.result.body', 'Approved AI comment');

        $this->assertDatabaseHas('issue_comments', [
            'issue_id' => $issue->id,
            'user_id' => $member->id,
            'parent_id' => null,
            'body' => 'Approved AI comment',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'user_id' => $member->id,
            'event' => 'issue.comment.created',
            'source' => 'ai_assistant',
            'subject_type' => IssueComment::class,
        ]);
    }

    public function test_issue_comment_reply_tool_calls_create_pending_confirmations(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Reply issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $parentComment = IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => User::factory()->create()->id,
            'body' => 'Original thread comment',
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I can add that reply once you confirm.',
            'tool_calls' => [[
                'id' => 'call_issue_comment_reply',
                'name' => 'reply_to_issue_comment',
                'arguments' => [
                    'issue_id' => $issue->id,
                    'parent_id' => $parentComment->id,
                    'body' => 'AI nested reply',
                ],
            ]],
        ]));

        $response = $this->actingAs($member)->postJson(route('assistant.messages.store'), [
            'message' => 'Reply to the comment',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation.tool_name', 'reply_to_issue_comment')
            ->assertJsonPath('data.pending_confirmation.status', 'pending');

        $this->assertDatabaseMissing('issue_comments', [
            'issue_id' => $issue->id,
            'parent_id' => $parentComment->id,
            'body' => 'AI nested reply',
        ]);
    }

    public function test_approved_issue_comment_reply_confirmations_execute_the_tool(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $member = User::factory()->create();
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Reply approval issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => $member->id,
        ]);
        $thread = AssistantThread::query()->create(['user_id' => $member->id]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $member->id,
            'role' => 'member',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $member->id,
        ]);

        $parentComment = IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => User::factory()->create()->id,
            'body' => 'Thread root',
        ]);

        $confirmation = AssistantActionConfirmation::query()->create([
            'thread_id' => $thread->id,
            'user_id' => $member->id,
            'tool_name' => 'reply_to_issue_comment',
            'payload_json' => [
                'issue_id' => $issue->id,
                'parent_id' => $parentComment->id,
                'body' => 'Approved AI reply',
            ],
            'status' => 'pending',
        ]);

        $response = $this->actingAs($member)->postJson(route('assistant.confirmations.approve', $confirmation), []);

        $response->assertOk()
            ->assertJsonPath('data.confirmation.status', 'executed')
            ->assertJsonPath('data.result.type', 'issue_comment')
            ->assertJsonPath('data.result.parent_id', $parentComment->id)
            ->assertJsonPath('data.result.body', 'Approved AI reply');

        $this->assertDatabaseHas('issue_comments', [
            'issue_id' => $issue->id,
            'user_id' => $member->id,
            'parent_id' => $parentComment->id,
            'body' => 'Approved AI reply',
        ]);
    }

    public function test_viewers_cannot_access_issue_mutation_tools(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $viewer->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to create an issue.',
            'tool_calls' => [[
                'id' => 'call_issue_forbidden',
                'name' => 'create_issue',
                'arguments' => [
                    'project_id' => $project->id,
                    'title' => 'Forbidden AI Issue',
                    'status' => 'todo',
                    'priority' => 'low',
                    'type' => 'task',
                ],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'Create issue',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');

        $this->assertDatabaseMissing('issues', [
            'title' => 'Forbidden AI Issue',
        ]);
        $this->assertDatabaseCount('assistant_action_confirmations', 0);
    }

    public function test_viewers_cannot_access_issue_comment_mutation_tools(): void
    {
        $client = Client::factory()->create([
            'behavior_id' => Behavior::query()->firstOrFail()->id,
        ]);
        $project = Project::factory()->create([
            'client_id' => $client->id,
            'status_id' => ProjectStatus::query()->where('slug', 'active')->firstOrFail()->id,
        ]);
        $viewer = User::factory()->create();
        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => 'Viewer issue',
            'status' => 'todo',
            'priority' => 'medium',
            'type' => 'task',
            'creator_id' => User::factory()->create()->id,
        ]);

        ClientMembership::query()->create([
            'client_id' => $client->id,
            'user_id' => $viewer->id,
            'role' => 'viewer',
        ]);

        ProjectMembership::query()->create([
            'project_id' => $project->id,
            'user_id' => $viewer->id,
        ]);

        $this->app->instance(AssistantModelClient::class, new FakeAssistantModelClient([
            'content' => 'I will try to add a comment.',
            'tool_calls' => [[
                'id' => 'call_issue_comment_forbidden',
                'name' => 'add_issue_comment',
                'arguments' => [
                    'issue_id' => $issue->id,
                    'body' => 'Forbidden viewer comment',
                ],
            ]],
        ]));

        $response = $this->actingAs($viewer)->postJson(route('assistant.messages.store'), [
            'message' => 'Add comment',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.pending_confirmation', null)
            ->assertJsonPath('data.messages.1.tool_results.0.type', 'error');

        $this->assertDatabaseMissing('issue_comments', [
            'issue_id' => $issue->id,
            'body' => 'Forbidden viewer comment',
        ]);
        $this->assertDatabaseCount('assistant_action_confirmations', 0);
    }
}

class FakeAssistantModelClient implements AssistantModelClient
{
    public function __construct(private readonly array $response) {}

    public function respond(array $messages, array $tools = []): array
    {
        return $this->response;
    }
}
