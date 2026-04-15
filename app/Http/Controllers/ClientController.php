<?php

namespace App\Http\Controllers;

use App\Actions\Clients\CreateClient;
use App\Actions\Clients\DeleteClient;
use App\Actions\Clients\UpdateClient;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Behavior;
use App\Models\Board;
use App\Models\Client;
use App\Models\ClientMembership;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use App\Support\ClientPermissionCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ClientController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,email,created_at,running_account,relationship_volume'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $clients = Client::query()
            ->select('clients.*')
            ->with('behavior:id,name,slug')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereIn(
                    'id',
                    $user->clientMemberships()->pluck('client_id'),
                ),
            )
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($clientQuery) use ($search): void {
                    $clientQuery->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhereHas('behavior', fn ($behaviorQuery) => $behaviorQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when(
                $sortBy === 'running_account',
                fn ($query) => $query
                    ->selectSub($this->runningAccountTransactionSumSubquery($user), 'running_account_tx_sort')
                    ->selectSub($this->relationshipVolumeSortSubquery($user), 'running_account_inv_sort')
                    ->orderByRaw('(running_account_tx_sort - running_account_inv_sort) '.$sortDirection)
                    ->orderBy('clients.name'),
            )
            ->when(
                $sortBy === 'relationship_volume',
                fn ($query) => $query
                    ->selectSub($this->relationshipVolumeSortSubquery($user), 'relationship_volume_sort')
                    ->orderBy('relationship_volume_sort', $sortDirection)
                    ->orderBy('clients.name'),
            )
            ->when(
                ! in_array($sortBy, ['running_account', 'relationship_volume'], true),
                fn ($query) => $query->orderBy($sortBy, $sortDirection),
            )
            ->paginate(15)
            ->withQueryString();

        $clientModels = collect($clients->items());
        $clientIds = $clientModels->pluck('id')->values();
        $financeAccessClientIds = $this->financeVisibleClientIdsForIndex($user, $clientIds);
        $financeSummaries = $this->financeSummariesForClientIndex($user, $clientIds);

        return Inertia::render('clients/index', [
            'clients' => $clientModels
                ->map(function (Client $client) use ($financeAccessClientIds, $financeSummaries) {
                    $financeSummary = $financeSummaries[$client->id] ?? null;
                    $canViewFinanceSummary = $financeAccessClientIds->contains($client->id);

                    return [
                        'id' => $client->id,
                        'name' => $client->name,
                        'email' => $client->email,
                        'image_path' => $client->image_path,
                        'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
                        'created_at' => $client->created_at?->toISOString(),
                        'running_account' => [
                            'amount' => $canViewFinanceSummary ? ($financeSummary['running_account']['amount'] ?? 0) : null,
                            'currency' => $canViewFinanceSummary ? ($financeSummary['running_account']['currency'] ?? null) : null,
                            'mixed_currencies' => $canViewFinanceSummary ? ($financeSummary['running_account']['mixed_currencies'] ?? false) : false,
                        ],
                        'relationship_volume' => [
                            'amount' => $canViewFinanceSummary ? ($financeSummary['relationship_volume']['amount'] ?? 0) : null,
                            'currency' => $canViewFinanceSummary ? ($financeSummary['relationship_volume']['currency'] ?? null) : null,
                            'mixed_currencies' => $canViewFinanceSummary ? ($financeSummary['relationship_volume']['mixed_currencies'] ?? false) : false,
                        ],
                        'can_view_finance_summary' => $canViewFinanceSummary,
                    ];
                })
                ->all(),
            'pagination' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ],
            'behaviors' => Behavior::query()
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
            'can_create_clients' => $user->isPlatformOwner(),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        abort_unless($request->user()->isPlatformOwner(), 403);

        return Inertia::render('clients/create', [
            'behaviors' => Behavior::query()
                ->orderBy('name')
                ->get(['id', 'name', 'slug']),
        ]);
    }

    public function edit(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canEditInternalClientProfile($client), 403);

        return Inertia::render('clients/edit', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'behavior_id' => $client->behavior_id,
                'industry' => $client->industry,
                'country_of_origin' => $client->country_of_origin,
                'address' => $client->address,
                'birthday' => $client->birthday?->toDateString(),
                'date_of_first_interaction' => $client->date_of_first_interaction?->toDateString(),
                'origin' => $client->origin,
                'notes' => $client->notes,
                'social_links' => $client->social_links_json ?? [],
                'phone_numbers' => $client->phoneNumbers()->get(['id', 'label', 'number'])->all(),
                'tags' => $client->tags()->pluck('name')->all(),
                'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
                'image_path' => $client->image_path,
            ],
            'behaviors' => Behavior::query()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    public function store(Request $request, CreateClient $createClient): RedirectResponse
    {
        abort_unless($request->user()->isPlatformOwner(), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'behavior_id' => ['nullable', 'integer', 'exists:behaviors,id'],
        ]);

        $createClient->handle($request->user(), $validated);

        return to_route('clients.index');
    }

    public function update(Request $request, Client $client, UpdateClient $updateClient): RedirectResponse
    {
        abort_unless($request->user()->canEditInternalClientProfile($client), 403);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'behavior_id' => ['nullable', 'integer', 'exists:behaviors,id'],
            'industry' => ['nullable', 'string', 'max:255'],
            'country_of_origin' => ['nullable', 'string', 'max:255'],
            'address' => ['nullable', 'string'],
            'birthday' => ['nullable', 'date'],
            'date_of_first_interaction' => ['nullable', 'date'],
            'origin' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'social_links_json' => ['nullable', 'array'],
            'social_links_json.*.label' => ['nullable', 'string', 'max:255'],
            'social_links_json.*.url' => ['nullable', 'string', 'max:2048'],
            'phone_numbers' => ['nullable', 'array'],
            'phone_numbers.*.label' => ['nullable', 'string', 'max:255'],
            'phone_numbers.*.number' => ['nullable', 'string', 'max:255'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['nullable', 'string', 'max:255'],
        ]);

        $updateClient->handle($request->user(), $client, $validated, 'manual_ui');

        return to_route('clients.show', $client);
    }

    public function destroy(Request $request, Client $client, DeleteClient $deleteClient): RedirectResponse
    {
        $deleteClient->handle($request->user(), $client);

        return to_route('clients.index');
    }

    public function uploadImage(Request $request, Client $client): RedirectResponse
    {
        abort_unless($request->user()->canEditInternalClientProfile($client), 403);

        $request->validate([
            'image' => ['required', 'image', 'max:2048'],
        ]);

        if ($client->image_path) {
            Storage::disk('public')->delete($client->image_path);
        }

        $path = $request->file('image')->store('clients', 'public');
        $client->update(['image_path' => $path]);

        AuditLog::query()->create([
            'user_id' => $request->user()->id,
            'event' => 'client.image_uploaded',
            'source' => 'web',
            'subject_type' => Client::class,
            'subject_id' => $client->id,
        ]);

        return back();
    }

    public function removeImage(Request $request, Client $client): RedirectResponse
    {
        abort_unless($request->user()->canEditInternalClientProfile($client), 403);

        if ($client->image_path) {
            Storage::disk('public')->delete($client->image_path);
            $client->update(['image_path' => null]);

            AuditLog::query()->create([
                'user_id' => $request->user()->id,
                'event' => 'client.image_removed',
                'source' => 'web',
                'subject_type' => Client::class,
                'subject_id' => $client->id,
            ]);
        }

        return back();
    }

    public function show(Request $request, Client $client): Response
    {
        $user = $request->user();
        $canViewInternalProfile = $user->canViewInternalClientProfile($client);

        abort_unless($user->canAccessClient($client), 403);

        $projects = $this->accessibleProjectsQuery($user, $client)
            ->with('status:id,name,slug')
            ->get();

        $projectIds = $projects->pluck('id');

        return Inertia::render('clients/show', [
            'client' => [
                'id' => $client->id,
                'name' => $client->name,
                'email' => $client->email,
                'image_path' => $client->image_path,
                'behavior' => $canViewInternalProfile ? $client->behavior?->only(['id', 'name', 'slug']) : null,
                'country_of_origin' => $canViewInternalProfile ? $client->country_of_origin : null,
                'industry' => $canViewInternalProfile ? $client->industry : null,
                'address' => $canViewInternalProfile ? $client->address : null,
                'birthday' => $canViewInternalProfile ? $client->birthday?->toDateString() : null,
                'date_of_first_interaction' => $canViewInternalProfile ? $client->date_of_first_interaction?->toDateString() : null,
                'origin' => $canViewInternalProfile ? $client->origin : null,
                'notes' => $canViewInternalProfile ? $client->notes : null,
                'social_links' => $canViewInternalProfile ? ($client->social_links_json ?? []) : [],
                'phone_numbers' => $canViewInternalProfile ? $client->phoneNumbers()->get(['id', 'label', 'number'])->all() : [],
                'tags' => $canViewInternalProfile ? $client->tags()->pluck('name')->all() : [],
            ],
            'secrets' => $user->canAccessPlatform()
                ? $client->secrets()
                    ->get(['id', 'label', 'description', 'updated_at'])
                    ->map(fn ($secret) => [
                        'id' => $secret->id,
                        'label' => $secret->label,
                        'description' => $secret->description,
                        'updated_at' => $secret->updated_at?->toISOString(),
                    ])
                    ->all()
                : [],
            'summary' => [
                'members_count' => $client->memberships()->count(),
                'projects_count' => $projects->count(),
                'issues_count' => Issue::query()->whereIn('project_id', $projectIds)->count(),
                'boards_count' => Board::query()->whereIn('project_id', $projectIds)->count(),
                'statuses_count' => ProjectStatus::query()
                    ->where(function ($query) use ($client): void {
                        $query->whereNull('client_id')
                            ->orWhere('client_id', $client->id);
                    })
                    ->count(),
            ],
            'recent_projects' => $projects
                ->sortByDesc('created_at')
                ->take(5)
                ->values()
                ->map(fn ($project) => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'status' => $project->status?->only(['id', 'name', 'slug']),
                ])
                ->all(),
            'recent_members' => $client->memberships()
                ->with('user:id,name,email,avatar_path')
                ->latest()
                ->take(5)
                ->get()
                ->map(fn ($membership) => [
                    'id' => $membership->id,
                    'role' => $membership->normalizedRole(),
                    'user' => [
                        'id' => $membership->user->id,
                        'name' => $membership->user->name,
                        'email' => $membership->user->email,
                        'avatar_path' => $membership->user->avatar_path,
                    ],
                ])
                ->all(),
            'can_manage_client' => $user->canManageClient($client),
            'can_manage_members' => $user->canManageMembers($client),
            'can_manage_secrets' => $user->canAccessPlatform(),
            'can_view_internal_client_profile' => $canViewInternalProfile,
            'can_edit_internal_client_profile' => $user->canEditInternalClientProfile($client),
            'behaviors' => Behavior::query()->orderBy('name')->get(['id', 'name', 'slug']),
        ]);
    }

    public function issues(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canAccessClient($client), 403);

        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'project_id' => $this->normalizedFilterValues($request, 'project_id'),
            'status' => $this->normalizedFilterValues($request, 'status'),
            'priority' => $this->normalizedFilterValues($request, 'priority'),
            'type' => $this->normalizedFilterValues($request, 'type'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:title,status,priority,type,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'project_id' => ['array'],
            'project_id.*' => ['string', 'regex:/^\d+$/'],
            'status' => ['array'],
            'status.*' => ['string', 'max:255'],
            'priority' => ['array'],
            'priority.*' => ['string', 'max:255'],
            'type' => ['array'],
            'type.*' => ['string', 'max:255'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();

        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $accessibleProjects = $this->accessibleProjectsQuery($user, $client)
            ->orderBy('name')
            ->get(['id', 'name', 'client_id']);
        $projectIds = $accessibleProjects->pluck('id');
        $projectIdFilter = $this->cleanFilterValues($validated['project_id'] ?? []);
        $statusFilter = $this->cleanFilterValues($validated['status'] ?? []);
        $priorityFilter = $this->cleanFilterValues($validated['priority'] ?? []);
        $typeFilter = $this->cleanFilterValues($validated['type'] ?? []);
        $creatableProjects = $accessibleProjects
            ->filter(fn (Project $project) => $user->canManageIssues($project))
            ->map(fn (Project $project) => $project->only(['id', 'name']))
            ->values()
            ->all();

        $issues = Issue::query()
            ->with([
                'project:id,name,client_id',
                'attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
                'comments.user:id,name,avatar_path',
                'comments.attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
            ])
            ->whereIn('project_id', $projectIds)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($issueQuery) use ($search): void {
                    $issueQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhere('priority', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%")
                        ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($projectIdFilter !== [], fn ($query) => $query->whereIn('project_id', array_map('intval', $projectIdFilter)))
            ->when($statusFilter !== [], fn ($query) => $query->whereIn('status', $statusFilter))
            ->when($priorityFilter !== [], fn ($query) => $query->whereIn('priority', $priorityFilter))
            ->when($typeFilter !== [], fn ($query) => $query->whereIn('type', $typeFilter))
            ->orderBy($sortBy, $sortDirection)
            ->orderBy('id', $sortDirection)
            ->paginate(8)
            ->withQueryString();

        $statusOptions = $this->serializeClientIssueClassificationFilterOptions($projectIds, 'status', ['todo', 'in_progress', 'done']);
        $priorityOptions = $this->serializeClientIssueClassificationFilterOptions($projectIds, 'priority', ['low', 'medium', 'high']);
        $typeOptions = $this->serializeClientIssueClassificationFilterOptions($projectIds, 'type', ['task', 'bug', 'feature']);

        return Inertia::render('clients/issues', [
            'client' => $this->serializeClientForWorkspace($client),
            'issues' => collect($issues->items())
                ->map(function (Issue $issue) use ($user) {
                    $attachments = $issue->attachments
                        ->sortBy('id')
                        ->map(fn (Attachment $attachment) => [
                            'id' => $attachment->id,
                            'file_name' => $attachment->file_name,
                            'file_path' => $attachment->file_path,
                            'mime_type' => $attachment->mime_type,
                            'file_size' => $attachment->file_size,
                            'url' => asset('storage/'.$attachment->file_path),
                            'is_image' => $attachment->isImage(),
                        ])
                        ->values();
                    $images = $attachments->filter(fn (array $attachment) => $attachment['is_image'])->values();

                    return [
                        'id' => $issue->id,
                        'title' => $issue->title,
                        'description' => $issue->description,
                        'status' => $issue->status,
                        'priority' => $issue->priority,
                        'type' => $issue->type,
                        'assignee_id' => $issue->assignee_id,
                        'due_date' => $issue->due_date?->toDateString(),
                        'estimated_hours' => $issue->estimated_hours,
                        'label' => $issue->label,
                        'created_at' => $issue->created_at?->toISOString(),
                        'updated_at' => $issue->updated_at?->toISOString(),
                        'project' => $issue->project?->only(['id', 'name']),
                        'attachments' => $attachments->all(),
                        'attachment_count' => $attachments->count(),
                        'image_count' => $images->count(),
                        'file_count' => $attachments->count() - $images->count(),
                        'preview_image_url' => $images->first()['url'] ?? null,
                        'comments' => $this->buildIssueCommentTree($issue->comments, null),
                        'comments_count' => $issue->comments->count(),
                        'can_comment' => $user->canCommentOnIssue($issue),
                        'can_manage_issue' => $user->canManageIssues($issue->project),
                    ];
                })
                ->all(),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
                'project_id' => $projectIdFilter,
                'status' => $statusFilter,
                'priority' => $priorityFilter,
                'type' => $typeFilter,
            ],
            'project_filter_options' => $accessibleProjects
                ->map(fn (Project $project) => [
                    'label' => $project->name,
                    'value' => (string) $project->id,
                ])
                ->values()
                ->all(),
            'status_filter_options' => $statusOptions,
            'priority_filter_options' => $priorityOptions,
            'type_filter_options' => $typeOptions,
            'pagination' => [
                'current_page' => $issues->currentPage(),
                'last_page' => $issues->lastPage(),
                'per_page' => $issues->perPage(),
                'total' => $issues->total(),
            ],
            'creatable_projects' => $creatableProjects,
        ]);
    }

    private function normalizedFilterValues(Request $request, string $key): array
    {
        return Arr::wrap($request->input($key));
    }

    private function cleanFilterValues(array $values): array
    {
        return collect($values)
            ->filter(fn ($value) => is_scalar($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function serializeClientIssueClassificationFilterOptions(Collection $projectIds, string $column, array $defaults): array
    {
        return Issue::query()
            ->whereIn('project_id', $projectIds)
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->pluck($column)
            ->map(fn ($value) => (string) $value)
            ->merge($defaults)
            ->unique()
            ->sort()
            ->values()
            ->map(fn (string $value) => [
                'label' => str_replace('_', ' ', ucfirst($value)),
                'value' => $value,
            ])
            ->all();
    }

    private function buildIssueCommentTree($comments, ?int $parentId): array
    {
        return $comments
            ->where('parent_id', $parentId)
            ->map(fn ($comment) => [
                'id' => $comment->id,
                'body' => $comment->body,
                'parent_id' => $comment->parent_id,
                'user' => $comment->user?->only(['id', 'name', 'avatar_path']),
                'created_at' => $comment->created_at?->toISOString(),
                'attachments' => $comment->attachments
                    ->map(fn (Attachment $attachment) => [
                        'id' => $attachment->id,
                        'file_name' => $attachment->file_name,
                        'file_path' => $attachment->file_path,
                        'mime_type' => $attachment->mime_type,
                        'file_size' => $attachment->file_size,
                        'url' => asset('storage/'.$attachment->file_path),
                        'is_image' => $attachment->isImage(),
                    ])
                    ->values()
                    ->all(),
                'replies' => $this->buildIssueCommentTree($comments, $comment->id),
            ])
            ->values()
            ->all();
    }

    public function boards(Request $request, Client $client): Response
    {
        $user = $request->user();
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,project_name,columns_count,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        abort_unless($user->canAccessClient($client), 403);

        $boards = $user->workspaceAccess()->scopeAccessibleBoards(
            Board::query()->with(['project:id,name,client_id', 'project.client:id'])->withCount('columns'),
            $client,
        );

        if ($search !== '') {
            $boards->where(function ($query) use ($search): void {
                $query->where('boards.name', 'like', "%{$search}%")
                    ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%"));
            });
        }

        $paginatedBoards = match ($sortBy) {
            'project_name' => $boards
                ->orderBy(
                    Project::query()
                        ->select('name')
                        ->whereColumn('projects.id', 'boards.project_id'),
                    $sortDirection,
                )
                ->paginate(15)
                ->withQueryString(),
            default => $boards
                ->orderBy($sortBy === 'columns_count' ? 'columns_count' : "boards.{$sortBy}", $sortDirection)
                ->paginate(15)
                ->withQueryString(),
        };

        return Inertia::render('clients/boards', [
            'client' => $this->serializeClientForWorkspace($client),
            'boards' => collect($paginatedBoards->items())
                ->map(fn (Board $board) => [
                    'id' => $board->id,
                    'name' => $board->name,
                    'project' => $board->project?->only(['id', 'name']),
                    'columns_count' => $board->columns_count,
                    'can_manage' => $user->canManageBoard($board),
                ])
                ->all(),
            'pagination' => [
                'current_page' => $paginatedBoards->currentPage(),
                'last_page' => $paginatedBoards->lastPage(),
                'per_page' => $paginatedBoards->perPage(),
                'total' => $paginatedBoards->total(),
            ],
            'can_create_boards' => $this->accessibleProjectsQuery($user, $client)
                ->get(['id', 'client_id'])
                ->contains(fn (Project $project) => $user->canCreateBoard($project)),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function statuses(Request $request, Client $client): Response
    {
        abort_unless($request->user()->canAccessClient($client), 403);

        return Inertia::render('clients/statuses', [
            'client' => $this->serializeClientForWorkspace($client),
            'statuses' => ProjectStatus::query()
                ->where(function ($query) use ($client): void {
                    $query->whereNull('client_id')
                        ->orWhere('client_id', $client->id);
                })
                ->orderBy('name')
                ->get(['id', 'name', 'slug', 'client_id', 'is_system'])
                ->all(),
        ]);
    }

    public function finance(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canAccessClientFinance($client), 403);

        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));

        $projectIds = $this->accessibleProjectsQuery($user, $client)->pluck('id');

        $transactionsQuery = Transaction::query()
            ->with('project:id,name,client_id')
            ->whereIn('project_id', $projectIds);

        $invoicesQuery = Invoice::query()
            ->with('project:id,name,client_id')
            ->whereIn('project_id', $projectIds);

        $allTransactions = (clone $transactionsQuery)
            ->orderByRaw('COALESCE(occurred_date, created_at)')
            ->get();

        $allInvoices = (clone $invoicesQuery)
            ->orderByRaw('COALESCE(issued_at, created_at)')
            ->get();

        return Inertia::render('clients/finance', [
            'client' => $this->serializeClientForWorkspace($client),
            'viewer_perspective' => $user->isPlatformOwner() ? 'platform_owner' : 'client_user',
            'filters' => [
                'search' => $search,
            ],
            'analysis' => $this->buildClientFinanceAnalysis(
                $projectIds,
                $allTransactions,
                $allInvoices,
            ),
            'transactions' => (clone $transactionsQuery)
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($transactionQuery) use ($search): void {
                        $transactionQuery->where('description', 'like', "%{$search}%")
                            ->orWhere('category', 'like', "%{$search}%")
                            ->orWhere('currency', 'like', "%{$search}%")
                            ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%"));
                    });
                })
                ->latest('occurred_date')
                ->get()
                ->map(fn (Transaction $transaction) => [
                    'id' => $transaction->id,
                    'description' => $transaction->description,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'occurred_date' => $transaction->occurred_date?->toDateString(),
                    'category' => $transaction->category,
                    'project' => $transaction->project?->only(['id', 'name']),
                ])
                ->all(),
            'invoices' => (clone $invoicesQuery)
                ->when($search !== '', function ($query) use ($search): void {
                    $query->where(function ($invoiceQuery) use ($search): void {
                        $invoiceQuery->where('reference', 'like', "%{$search}%")
                            ->orWhere('status', 'like', "%{$search}%")
                            ->orWhere('currency', 'like', "%{$search}%")
                            ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%"));
                    });
                })
                ->latest('issued_at')
                ->get()
                ->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'status' => $invoice->status,
                    'amount' => $invoice->amount,
                    'currency' => $invoice->currency,
                    'issued_at' => $invoice->issued_at?->toDateString(),
                    'due_at' => $invoice->due_at?->toDateString(),
                    'paid_at' => $invoice->paid_at?->toDateString(),
                    'project' => $invoice->project?->only(['id', 'name']),
                ])
                ->all(),
        ]);
    }

    private function buildClientFinanceAnalysis(
        Collection $projectIds,
        Collection $transactions,
        Collection $invoices,
    ): array {
        $runningAccountRows = collect();

        foreach ($transactions as $transaction) {
            $runningAccountRows->push((object) [
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
            ]);
        }

        foreach ($invoices as $invoice) {
            $runningAccountRows->push((object) [
                'amount' => -(float) $invoice->amount,
                'currency' => $invoice->currency,
            ]);
        }

        $currencyKeys = $transactions
            ->pluck('currency')
            ->merge($invoices->pluck('currency'))
            ->map(fn ($currency) => $this->normalizeMoneyCurrencyKey($currency))
            ->unique()
            ->sort()
            ->values();

        return [
            'overall' => [
                'project_count' => $projectIds->count(),
                'transaction_count' => $transactions->count(),
                'invoice_count' => $invoices->count(),
                'currencies' => $currencyKeys
                    ->map(fn (string $key) => $this->moneyCurrencyLabel($key))
                    ->all(),
                'running_account' => $this->summarizeMoneyCollection(
                    $runningAccountRows,
                    'amount',
                    'currency',
                ),
                'relationship_volume' => $this->summarizeMoneyCollection(
                    $invoices,
                    'amount',
                    'currency',
                ),
                'transaction_volume' => $this->summarizeMoneyCollection(
                    $transactions,
                    'amount',
                    'currency',
                ),
            ],
            'by_currency' => $currencyKeys
                ->map(function (string $currencyKey) use ($transactions, $invoices): array {
                    $currencyTransactions = $transactions
                        ->filter(fn (Transaction $transaction) => $this->normalizeMoneyCurrencyKey($transaction->currency) === $currencyKey)
                        ->values();
                    $currencyInvoices = $invoices
                        ->filter(fn (Invoice $invoice) => $this->normalizeMoneyCurrencyKey($invoice->currency) === $currencyKey)
                        ->values();

                    $transactionTotal = round($currencyTransactions->sum(fn (Transaction $transaction) => (float) $transaction->amount), 2);
                    $invoiceTotal = round($currencyInvoices->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2);
                    $runningAccount = round($transactionTotal - $invoiceTotal, 2);
                    $openStatuses = ['draft', 'pending', 'overdue'];

                    return [
                        'currency' => $currencyKey === 'UNSPECIFIED' ? null : $currencyKey,
                        'label' => $this->moneyCurrencyLabel($currencyKey),
                        'running_account' => $runningAccount,
                        'client_owes_you' => max(round($invoiceTotal - $transactionTotal, 2), 0),
                        'you_owe_client' => max($runningAccount, 0),
                        'transaction_total' => $transactionTotal,
                        'invoice_total' => $invoiceTotal,
                        'received_total' => round($currencyTransactions
                            ->filter(fn (Transaction $transaction) => (float) $transaction->amount > 0)
                            ->sum(fn (Transaction $transaction) => (float) $transaction->amount), 2),
                        'refund_total' => round(abs($currencyTransactions
                            ->filter(fn (Transaction $transaction) => (float) $transaction->amount < 0)
                            ->sum(fn (Transaction $transaction) => (float) $transaction->amount)), 2),
                        'open_invoice_total' => round($currencyInvoices
                            ->filter(fn (Invoice $invoice) => in_array($invoice->status, $openStatuses, true))
                            ->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2),
                        'invoice_statuses' => collect(['draft', 'pending', 'paid', 'overdue'])
                            ->mapWithKeys(fn (string $status) => [
                                $status => [
                                    'count' => $currencyInvoices->where('status', $status)->count(),
                                    'amount' => round($currencyInvoices
                                        ->where('status', $status)
                                        ->sum(fn (Invoice $invoice) => (float) $invoice->amount), 2),
                                ],
                            ])
                            ->all(),
                        'timeline' => $this->buildClientFinanceTimeline(
                            $currencyTransactions,
                            $currencyInvoices,
                        ),
                    ];
                })
                ->all(),
        ];
    }

    private function buildClientFinanceTimeline(
        Collection $transactions,
        Collection $invoices,
    ): array {
        $events = collect();

        foreach ($transactions as $transaction) {
            $date = $transaction->occurred_date
                ? CarbonImmutable::parse($transaction->occurred_date)
                : CarbonImmutable::parse($transaction->created_at);

            $events->push([
                'type' => 'transaction',
                'date' => $date,
                'amount' => (float) $transaction->amount,
            ]);
        }

        foreach ($invoices as $invoice) {
            $date = $invoice->issued_at
                ? CarbonImmutable::parse($invoice->issued_at)
                : CarbonImmutable::parse($invoice->created_at);

            $events->push([
                'type' => 'invoice',
                'date' => $date,
                'amount' => (float) $invoice->amount,
            ]);
        }

        if ($events->isEmpty()) {
            return [];
        }

        $firstMonth = $events->min('date')->startOfMonth();
        $lastMonth = $events->max('date')->startOfMonth();
        $rangeStart = $firstMonth->lessThan($lastMonth->subMonths(11))
            ? $lastMonth->subMonths(11)
            : $firstMonth;

        $initialInvoiced = $events
            ->filter(fn (array $event) => $event['type'] === 'invoice' && $event['date']->lessThan($rangeStart))
            ->sum('amount');
        $initialPaid = $events
            ->filter(fn (array $event) => $event['type'] === 'transaction' && $event['date']->lessThan($rangeStart))
            ->sum('amount');

        $currentMonth = $rangeStart;
        $cumulativeInvoiced = (float) $initialInvoiced;
        $cumulativePaid = (float) $initialPaid;
        $timeline = [];

        while ($currentMonth->lessThanOrEqualTo($lastMonth)) {
            $monthEvents = $events->filter(fn (array $event) => $event['date']->format('Y-m') === $currentMonth->format('Y-m'));

            $monthlyInvoiced = (float) $monthEvents
                ->filter(fn (array $event) => $event['type'] === 'invoice')
                ->sum('amount');
            $monthlyPaid = (float) $monthEvents
                ->filter(fn (array $event) => $event['type'] === 'transaction')
                ->sum('amount');

            $cumulativeInvoiced += $monthlyInvoiced;
            $cumulativePaid += $monthlyPaid;

            $timeline[] = [
                'period' => $currentMonth->format('Y-m'),
                'label' => $currentMonth->format('M Y'),
                'monthly_invoiced' => round($monthlyInvoiced, 2),
                'monthly_paid' => round($monthlyPaid, 2),
                'cumulative_invoiced' => round($cumulativeInvoiced, 2),
                'cumulative_paid' => round($cumulativePaid, 2),
                'running_account' => round($cumulativePaid - $cumulativeInvoiced, 2),
            ];

            $currentMonth = $currentMonth->addMonth();
        }

        return $timeline;
    }

    private function normalizeMoneyCurrencyKey(?string $currency): string
    {
        $normalized = strtoupper(trim((string) $currency));

        return $normalized !== '' ? $normalized : 'UNSPECIFIED';
    }

    private function moneyCurrencyLabel(string $currencyKey): string
    {
        return $currencyKey === 'UNSPECIFIED' ? 'No currency' : $currencyKey;
    }

    private function accessibleProjectsQuery($user, Client $client)
    {
        return Project::query()
            ->whereBelongsTo($client)
            ->when(
                ! $user->canManageClient($client),
                fn ($query) => $query->whereHas('memberships', fn ($membershipQuery) => $membershipQuery->where('user_id', $user->id)),
            );
    }

    private function financeVisibleClientIdsForIndex(User $user, Collection $clientIds): Collection
    {
        if ($clientIds->isEmpty()) {
            return collect();
        }

        if ($user->isPlatformOwner()) {
            return $clientIds;
        }

        return $user->clientMemberships()
            ->whereIn('client_id', $clientIds->all())
            ->with('permissions')
            ->get()
            ->filter(function (ClientMembership $membership): bool {
                if (in_array($membership->normalizedRole(), ['owner', 'admin'], true)) {
                    return true;
                }

                return count(array_intersect(
                    $membership->permissionNames(),
                    [ClientPermissionCatalog::FINANCE_READ, ClientPermissionCatalog::FINANCE_WRITE],
                )) > 0;
            })
            ->pluck('client_id')
            ->unique()
            ->values();
    }

    private function financeSummariesForClientIndex(User $user, Collection $clientIds): array
    {
        if ($clientIds->isEmpty()) {
            return [];
        }

        $projects = $user->workspaceAccess()
            ->scopeAccessibleFinanceProjects(
                Project::query()
                    ->whereIn('client_id', $clientIds->all()),
            )
            ->get(['id', 'client_id', 'budget', 'currency']);

        if ($projects->isEmpty()) {
            return [];
        }

        $projectClientMap = $projects->pluck('client_id', 'id');
        $transactions = Transaction::query()
            ->whereIn('project_id', $projectClientMap->keys())
            ->get(['project_id', 'amount', 'currency']);

        $invoices = Invoice::query()
            ->whereIn('project_id', $projectClientMap->keys())
            ->get(['project_id', 'amount', 'currency']);

        $runningAccountRows = collect();
        foreach ($transactions as $transaction) {
            $runningAccountRows->push((object) [
                'client_id' => $projectClientMap->get($transaction->project_id),
                'amount' => (float) $transaction->amount,
                'currency' => $transaction->currency,
            ]);
        }
        foreach ($invoices as $invoice) {
            $runningAccountRows->push((object) [
                'client_id' => $projectClientMap->get($invoice->project_id),
                'amount' => -(float) $invoice->amount,
                'currency' => $invoice->currency,
            ]);
        }

        $runningAccountByClient = $runningAccountRows
            ->groupBy('client_id')
            ->map(fn (Collection $rows) => $this->summarizeMoneyCollection(
                $rows,
                'amount',
                'currency',
            ));

        $relationshipVolumeByClient = $invoices
            ->groupBy(fn (Invoice $invoice) => $projectClientMap->get($invoice->project_id))
            ->map(fn (Collection $clientInvoices) => $this->summarizeMoneyCollection(
                $clientInvoices,
                'amount',
                'currency',
            ));

        return $clientIds
            ->mapWithKeys(fn (int $clientId) => [
                $clientId => [
                    'running_account' => $runningAccountByClient->get($clientId, [
                        'amount' => 0,
                        'currency' => null,
                        'mixed_currencies' => false,
                    ]),
                    'relationship_volume' => $relationshipVolumeByClient->get($clientId, [
                        'amount' => 0,
                        'currency' => null,
                        'mixed_currencies' => false,
                    ]),
                ],
            ])
            ->all();
    }

    private function summarizeMoneyCollection(Collection $rows, string $amountKey, string $currencyKey): array
    {
        $currencies = $rows
            ->pluck($currencyKey)
            ->filter()
            ->unique()
            ->values();

        return [
            'amount' => round($rows->sum(fn ($row) => (float) ($row->{$amountKey} ?? 0)), 2),
            'currency' => $currencies->count() === 1 ? $currencies->first() : null,
            'mixed_currencies' => $currencies->count() > 1,
        ];
    }

    private function runningAccountTransactionSumSubquery(User $user): QueryBuilder
    {
        $accessibleProjects = $user->workspaceAccess()->scopeAccessibleFinanceProjects(
            Project::query()
                ->select('projects.id')
                ->whereColumn('projects.client_id', 'clients.id'),
        );

        return Transaction::query()
            ->selectRaw('COALESCE(SUM(transactions.amount), 0)')
            ->whereIn('project_id', $accessibleProjects)
            ->toBase();
    }

    private function relationshipVolumeSortSubquery(User $user): QueryBuilder
    {
        $accessibleProjects = $user->workspaceAccess()->scopeAccessibleFinanceProjects(
            Project::query()
                ->select('projects.id')
                ->whereColumn('projects.client_id', 'clients.id'),
        );

        return Invoice::query()
            ->selectRaw('COALESCE(SUM(invoices.amount), 0)')
            ->whereIn('project_id', $accessibleProjects)
            ->toBase();
    }

    private function serializeClientForWorkspace(Client $client): array
    {
        return [
            'id' => $client->id,
            'name' => $client->name,
            'email' => $client->email,
            'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
        ];
    }
}
