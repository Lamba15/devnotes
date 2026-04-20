<?php

namespace App\Http\Controllers;

use App\Actions\Clients\CreateClientUser;
use App\Actions\Clients\DeleteClientMembership;
use App\Actions\Clients\UpdateClientMembership;
use App\Actions\Clients\UpdateClientMembershipPassword;
use App\Http\Concerns\BuildsBreadcrumbs;
use App\Http\Requests\Clients\ClientMembershipPasswordUpdateRequest;
use App\Models\AssistantMessage;
use App\Models\AssistantRun;
use App\Models\AssistantThread;
use App\Models\AssistantToolExecution;
use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardMembership;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Project;
use App\Models\ProjectMembership;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ClientMembershipController extends Controller
{
    use BuildsBreadcrumbs;

    private const ROLES = ['owner', 'admin', 'member'];

    private const GRAPH_RANGES = ['30d', '90d', '365d', 'all'];

    public function create(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canManageMembers($client), 403);

        return Inertia::render('clients/members/create', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->membersCrumb($client),
                $this->crumb('New Member', "/clients/{$client->id}/members/create"),
            ),
            'client' => $this->serializeClient($client),
            'roles' => $this->roleOptions(),
        ]);
    }

    public function edit(Request $request, Client $client, ClientMembership $membership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function index(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canViewMembers($client), 403);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,email,role,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $query = $client->memberships()
            ->with(['user:id,name,email,email_verified_at,avatar_path,ai_credits,ai_credits_used', 'permissions'])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($membershipQuery) use ($search): void {
                    $membershipQuery->where('role', 'like', "%{$search}%")
                        ->orWhereHas('user', fn ($userQuery) => $userQuery->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
                });
            });

        if ($sortBy === 'name' || $sortBy === 'email') {
            $query->join('users', 'users.id', '=', 'client_memberships.user_id')
                ->orderBy("users.{$sortBy}", $sortDirection)
                ->select('client_memberships.*');
        } else {
            $query->orderBy($sortBy, $sortDirection);
        }

        $memberships = $query->paginate(15)->withQueryString();
        $canManageMembers = $user->canManageMembers($client);

        return Inertia::render('clients/members/index', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->membersCrumb($client),
            ),
            'client' => $this->serializeClient($client),
            'memberships' => collect($memberships->items())
                ->map(fn (ClientMembership $membership) => $this->serializeMembershipListItem($membership))
                ->all(),
            'pagination' => [
                'current_page' => $memberships->currentPage(),
                'last_page' => $memberships->lastPage(),
                'per_page' => $memberships->perPage(),
                'total' => $memberships->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
            'roles' => $this->roleOptions(),
            'permission_catalog' => $this->permissionCatalog(),
            'can_manage_members' => $canManageMembers,
            'can_open_member_profiles' => $user->canViewMembers($client),
            'can_manage_ai_credits' => $user->isPlatformOwner(),
        ]);
    }

    public function show(Request $request, Client $client, ClientMembership $membership): Response
    {
        $actor = $request->user();

        abort_unless($actor->canViewMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        $membership->load(['user', 'permissions']);
        $targetUser = $membership->user;

        $projectAssignments = ProjectMembership::query()
            ->where('user_id', $targetUser->id)
            ->whereHas('project', fn ($query) => $query->where('client_id', $client->id))
            ->pluck('project_id')
            ->all();
        $boardAssignments = BoardMembership::query()
            ->where('user_id', $targetUser->id)
            ->whereHas('board.project', fn ($query) => $query->where('client_id', $client->id))
            ->pluck('board_id')
            ->all();
        $projects = Project::query()
            ->where('client_id', $client->id)
            ->orderBy('name')
            ->get(['id', 'name', 'client_id']);
        $boards = Board::query()
            ->with('project:id,name,client_id')
            ->whereHas('project', fn ($query) => $query->where('client_id', $client->id))
            ->orderBy('name')
            ->get(['id', 'project_id', 'name']);

        $activityData = $this->memberActivityData($targetUser);

        return Inertia::render('clients/members/show', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->clientsCrumb(),
                $this->clientCrumb($client),
                $this->membersCrumb($client),
                $this->crumb($membership->user->name, "/clients/{$client->id}/members/{$membership->id}"),
            ),
            'client' => $this->serializeClient($client),
            'membership' => $this->serializeMembershipProfile(
                membership: $membership,
                projectAssignments: $projectAssignments,
                boardAssignments: $boardAssignments,
                activityData: $activityData,
            ),
            'roles' => $this->roleOptions(),
            'permission_catalog' => $this->permissionCatalog(),
            'graph_ranges' => self::GRAPH_RANGES,
            'available_projects' => $projects
                ->map(fn (Project $project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                ])
                ->all(),
            'available_boards' => $boards
                ->map(fn (Board $board) => [
                    'id' => $board->id,
                    'name' => $board->name,
                    'project' => $board->project?->only(['id', 'name']),
                ])
                ->all(),
            'can_manage_members' => $actor->canManageMembers($client),
            'can_manage_ai_credits' => $actor->isPlatformOwner(),
            'can_manage_passwords' => $actor->isPlatformOwner(),
        ]);
    }

    public function store(
        Request $request,
        Client $client,
        CreateClientUser $createClientUser,
    ): RedirectResponse {
        abort_unless($request->user()->canManageMembers($client), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(self::ROLES)],
        ]);

        $membership = $createClientUser->handle($request->user(), $client, $validated);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function update(Request $request, Client $client, ClientMembership $membership, UpdateClientMembership $updateClientMembership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($membership->user_id),
            ],
            'role' => ['required', Rule::in(self::ROLES)],
        ]);

        $updateClientMembership->handle($request->user(), $membership, $validated);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function updatePassword(
        ClientMembershipPasswordUpdateRequest $request,
        Client $client,
        ClientMembership $membership,
        UpdateClientMembershipPassword $updateClientMembershipPassword,
    ): RedirectResponse {
        abort_unless($request->user()->isPlatformOwner(), 403);
        abort_unless($membership->client_id === $client->id, 404);

        $updateClientMembershipPassword->handle(
            actor: $request->user(),
            membership: $membership,
            password: $request->string('password')->value(),
        );

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function syncPermissions(Request $request, Client $client, ClientMembership $membership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        if ($membership->normalizedRole() !== 'member') {
            return back()->withErrors([
                'permissions' => 'Only member roles use explicit permission rows.',
            ]);
        }

        $validated = $request->validate([
            'permissions' => ['nullable', 'array'],
            'permissions.*' => ['string', Rule::in(ClientPermissionCatalog::all())],
        ]);

        $permissions = ClientPermissionCatalog::normalize($validated['permissions'] ?? []);
        $before = $membership->permissionNames();

        DB::transaction(function () use ($membership, $permissions, $request): void {
            $membership->permissions()->delete();

            foreach ($permissions as $permission) {
                $membership->permissions()->create([
                    'permission_name' => $permission,
                    'granted_by' => $request->user()->id,
                ]);
            }
        });

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'client.user.permissions_synced',
            'source' => 'manual_ui',
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
            'metadata_json' => ['client_id' => $client->id],
            'before_json' => ['permissions' => $before],
            'after_json' => ['permissions' => $permissions],
        ]);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function syncProjects(Request $request, Client $client, ClientMembership $membership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);
        abort_unless($membership->normalizedRole() === 'member', 422);

        $validated = $request->validate([
            'project_ids' => ['nullable', 'array'],
            'project_ids.*' => [
                'integer',
                Rule::exists('projects', 'id')->where(fn ($query) => $query->where('client_id', $client->id)),
            ],
        ]);

        $projectIds = collect($validated['project_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
        $beforeProjectIds = ProjectMembership::query()
            ->where('user_id', $membership->user_id)
            ->whereHas('project', fn ($query) => $query->where('client_id', $client->id))
            ->pluck('project_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        DB::transaction(function () use ($client, $membership, $projectIds): void {
            ProjectMembership::query()
                ->where('user_id', $membership->user_id)
                ->whereHas('project', fn ($query) => $query->where('client_id', $client->id))
                ->delete();

            foreach ($projectIds as $projectId) {
                ProjectMembership::query()->create([
                    'project_id' => $projectId,
                    'user_id' => $membership->user_id,
                ]);
            }

            BoardMembership::query()
                ->where('user_id', $membership->user_id)
                ->whereHas('board.project', fn ($query) => $query->where('client_id', $client->id)
                    ->whereNotIn('projects.id', $projectIds->all()))
                ->delete();
        });

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'client.user.projects_synced',
            'source' => 'manual_ui',
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
            'metadata_json' => ['client_id' => $client->id],
            'before_json' => ['project_ids' => $beforeProjectIds],
            'after_json' => ['project_ids' => $projectIds->all()],
        ]);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function syncBoards(Request $request, Client $client, ClientMembership $membership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);
        abort_unless($membership->normalizedRole() === 'member', 422);

        $validated = $request->validate([
            'board_ids' => ['nullable', 'array'],
            'board_ids.*' => [
                'integer',
                Rule::exists('boards', 'id')->where(fn ($query) => $query->whereIn(
                    'project_id',
                    Project::query()->where('client_id', $client->id)->select('id'),
                )),
            ],
        ]);

        $assignedProjectIds = ProjectMembership::query()
            ->where('user_id', $membership->user_id)
            ->whereHas('project', fn ($query) => $query->where('client_id', $client->id))
            ->pluck('project_id')
            ->all();
        $requestedBoardIds = collect($validated['board_ids'] ?? [])->map(fn ($id) => (int) $id)->unique()->values();
        $boardIds = Board::query()
            ->whereIn('id', $requestedBoardIds)
            ->whereIn('project_id', $assignedProjectIds)
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values();
        $beforeBoardIds = BoardMembership::query()
            ->where('user_id', $membership->user_id)
            ->whereHas('board.project', fn ($query) => $query->where('client_id', $client->id))
            ->pluck('board_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        DB::transaction(function () use ($client, $membership, $boardIds): void {
            BoardMembership::query()
                ->where('user_id', $membership->user_id)
                ->whereHas('board.project', fn ($query) => $query->where('client_id', $client->id))
                ->delete();

            foreach ($boardIds as $boardId) {
                BoardMembership::query()->create([
                    'board_id' => $boardId,
                    'user_id' => $membership->user_id,
                ]);
            }
        });

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'client.user.boards_synced',
            'source' => 'manual_ui',
            'subject_type' => User::class,
            'subject_id' => $membership->user_id,
            'metadata_json' => ['client_id' => $client->id],
            'before_json' => ['board_ids' => $beforeBoardIds],
            'after_json' => ['board_ids' => $boardIds->all()],
        ]);

        return to_route('clients.members.show', [$client, $membership]);
    }

    public function destroy(Request $request, Client $client, ClientMembership $membership, DeleteClientMembership $deleteClientMembership): RedirectResponse
    {
        abort_unless($request->user()->canManageMembers($client), 403);
        abort_unless($membership->client_id === $client->id, 404);

        $deleteClientMembership->handle($request->user(), $membership);

        return to_route('clients.members.index', $client);
    }

    private function serializeMembershipListItem(ClientMembership $membership): array
    {
        return [
            'id' => $membership->id,
            'role' => $membership->normalizedRole(),
            'permissions' => $membership->permissionNames(),
            'created_at' => $membership->created_at?->toISOString(),
            'user' => [
                'id' => $membership->user->id,
                'name' => $membership->user->name,
                'email' => $membership->user->email,
                'email_verified_at' => $membership->user->email_verified_at?->toISOString(),
                'avatar_path' => $membership->user->avatar_path,
                'ai_credits' => $membership->user->ai_credits,
                'ai_credits_used' => $membership->user->ai_credits_used,
            ],
        ];
    }

    private function serializeMembershipProfile(
        ClientMembership $membership,
        array $projectAssignments,
        array $boardAssignments,
        array $activityData,
    ): array {
        $isUnrestricted = in_array($membership->normalizedRole(), ['owner', 'admin'], true);
        $projectIds = $isUnrestricted ? [] : $projectAssignments;
        $boardIds = $isUnrestricted ? [] : $boardAssignments;
        $projectsCount = $isUnrestricted
            ? Project::query()->where('client_id', $membership->client_id)->count()
            : count($projectAssignments);
        $boardsCount = $isUnrestricted
            ? Board::query()->whereHas('project', fn ($query) => $query->where('client_id', $membership->client_id))->count()
            : count($boardAssignments);

        return [
            'id' => $membership->id,
            'role' => $membership->normalizedRole(),
            'is_unrestricted' => $isUnrestricted,
            'joined_at' => $membership->created_at?->toISOString(),
            'permissions' => $membership->permissionNames(),
            'user' => [
                'id' => $membership->user->id,
                'name' => $membership->user->name,
                'email' => $membership->user->email,
                'avatar_path' => $membership->user->avatar_path,
                'email_verified_at' => $membership->user->email_verified_at?->toISOString(),
                'ai_credits' => $membership->user->ai_credits,
                'ai_credits_used' => $membership->user->ai_credits_used,
            ],
            'assignments' => [
                'project_ids' => $projectIds,
                'board_ids' => $boardIds,
                'projects_count' => $projectsCount,
                'boards_count' => $boardsCount,
            ],
            'activity' => $activityData,
        ];
    }

    private function memberActivityData(User $user): array
    {
        $auditLogs = AuditLog::query()
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->limit(25)
            ->get();
        $assistantThreads = AssistantThread::query()->where('user_id', $user->id);
        $assistantMessages = AssistantMessage::query()
            ->where('role', 'user')
            ->whereHas('thread', fn ($query) => $query->where('user_id', $user->id));
        $assistantRuns = AssistantRun::query()->where('user_id', $user->id);
        $assistantToolExecutions = AssistantToolExecution::query()
            ->whereHas('run', fn ($query) => $query->where('user_id', $user->id));
        $latestAuditLog = AuditLog::query()->where('user_id', $user->id)->latest('created_at')->first();
        $latestAssistantRun = AssistantRun::query()->where('user_id', $user->id)->latest('created_at')->first();
        $latestActivityAt = match (true) {
            $latestAuditLog?->created_at === null => $latestAssistantRun?->created_at,
            $latestAssistantRun?->created_at === null => $latestAuditLog->created_at,
            $latestAuditLog->created_at->greaterThan($latestAssistantRun->created_at) => $latestAuditLog->created_at,
            default => $latestAssistantRun->created_at,
        };
        $tokenSummary = $assistantRuns
            ->get(['metadata_json'])
            ->reduce(function (array $carry, AssistantRun $run): array {
                $usage = $run->metadata_json['usage'] ?? $run->metadata_json['token_usage'] ?? [];

                $carry['prompt_tokens'] += (int) ($usage['prompt_tokens'] ?? $usage['input_tokens'] ?? 0);
                $carry['completion_tokens'] += (int) ($usage['completion_tokens'] ?? $usage['output_tokens'] ?? 0);
                $carry['total_tokens'] += (int) ($usage['total_tokens'] ?? 0);

                return $carry;
            }, [
                'prompt_tokens' => 0,
                'completion_tokens' => 0,
                'total_tokens' => 0,
            ]);

        return [
            'last_activity_at' => $latestActivityAt?->toISOString(),
            'general_usage' => $this->dailySeries(
                AuditLog::query()->where('user_id', $user->id),
                'created_at',
            ),
            'ai_usage' => $this->dailySeries(
                AssistantRun::query()->where('user_id', $user->id),
                'created_at',
            ),
            'audit_feed' => $auditLogs->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'event' => $log->event,
                'source' => $log->source,
                'subject_type' => class_basename((string) $log->subject_type),
                'subject_id' => $log->subject_id,
                'created_at' => $log->created_at?->toISOString(),
            ])->all(),
            'assistant_summary' => [
                'threads_count' => (clone $assistantThreads)->count(),
                'messages_count' => (clone $assistantMessages)->count(),
                'runs_count' => (clone $assistantRuns)->count(),
                'tool_executions_count' => (clone $assistantToolExecutions)->count(),
                ...$tokenSummary,
            ],
        ];
    }

    private function dailySeries($query, string $column): array
    {
        return $query
            ->selectRaw("DATE({$column}) as day, COUNT(*) as total")
            ->groupBy('day')
            ->orderBy('day')
            ->get()
            ->map(fn ($row) => [
                'date' => Carbon::parse($row->day)->toDateString(),
                'count' => (int) $row->total,
            ])
            ->all();
    }

    private function roleOptions(): array
    {
        return collect(self::ROLES)->map(fn (string $role) => [
            'label' => ucfirst($role),
            'value' => $role,
        ])->all();
    }

    private function permissionCatalog(): array
    {
        return collect(ClientPermissionCatalog::all())
            ->map(fn (string $permission) => [
                'value' => $permission,
                'label' => str($permission)
                    ->replace('.', ' ')
                    ->title()
                    ->value(),
                'group' => str($permission)->before('.')->value(),
            ])
            ->all();
    }

    private function serializeClient(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'email' => $client->email,
            'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
        ];
    }
}
