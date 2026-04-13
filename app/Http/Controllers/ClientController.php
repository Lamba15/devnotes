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
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
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
                    ->selectSub($this->runningAccountSortSubquery($user), 'running_account_sort')
                    ->orderBy('running_account_sort', $sortDirection)
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

        $accessibleProjects = $this->accessibleProjectsQuery($user, $client)
            ->orderBy('name')
            ->get(['id', 'name', 'client_id']);
        $projectIds = $accessibleProjects->pluck('id');
        $creatableProjects = $accessibleProjects
            ->filter(fn (Project $project) => $user->canManageIssues($project))
            ->map(fn (Project $project) => $project->only(['id', 'name']))
            ->values()
            ->all();

        return Inertia::render('clients/issues', [
            'client' => $this->serializeClientForWorkspace($client),
            'issues' => Issue::query()
                ->with([
                    'project:id,name,client_id',
                    'attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
                    'comments.user:id,name,avatar_path',
                    'comments.attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
                ])
                ->whereIn('project_id', $projectIds)
                ->latest('id')
                ->get()
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
                    ];
                })
                ->all(),
            'creatable_projects' => $creatableProjects,
        ]);
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
            Board::query()->with(['project:id,name,client_id'])->withCount('columns'),
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
                ])
                ->all(),
            'pagination' => [
                'current_page' => $paginatedBoards->currentPage(),
                'last_page' => $paginatedBoards->lastPage(),
                'per_page' => $paginatedBoards->perPage(),
                'total' => $paginatedBoards->total(),
            ],
            'can_manage_boards' => $user->canManageClient($client),
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

        $projectIds = $this->accessibleProjectsQuery($user, $client)->pluck('id');

        return Inertia::render('clients/finance', [
            'client' => $this->serializeClientForWorkspace($client),
            'transactions' => Transaction::query()
                ->with('project:id,name,client_id')
                ->whereIn('project_id', $projectIds)
                ->latest('occurred_at')
                ->get()
                ->map(fn (Transaction $transaction) => [
                    'id' => $transaction->id,
                    'description' => $transaction->description,
                    'amount' => $transaction->amount,
                    'currency' => $transaction->currency,
                    'occurred_at' => $transaction->occurred_at?->toDateString(),
                    'project' => $transaction->project?->only(['id', 'name']),
                ])
                ->all(),
            'invoices' => Invoice::query()
                ->with('project:id,name,client_id')
                ->whereIn('project_id', $projectIds)
                ->latest('id')
                ->get()
                ->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'status' => $invoice->status,
                    'amount' => $invoice->amount,
                    'currency' => $invoice->currency,
                    'project' => $invoice->project?->only(['id', 'name']),
                ])
                ->all(),
        ]);
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

        $runningAccountByClient = $transactions
            ->groupBy(fn (Transaction $transaction) => $projectClientMap->get($transaction->project_id))
            ->map(fn (Collection $clientTransactions) => $this->summarizeMoneyCollection(
                $clientTransactions,
                'amount',
                'currency',
            ));

        $invoices = Invoice::query()
            ->whereIn('project_id', $projectClientMap->keys())
            ->get(['project_id', 'amount', 'currency']);

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

    private function runningAccountSortSubquery(User $user): QueryBuilder
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
