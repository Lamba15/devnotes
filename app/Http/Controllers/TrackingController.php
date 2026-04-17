<?php

namespace App\Http\Controllers;

use App\Http\Concerns\BuildsBreadcrumbs;
use App\Models\Board;
use App\Models\Client;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TrackingController extends Controller
{
    use BuildsBreadcrumbs;

    public function issues(Request $request): Response
    {
        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'client_id' => $this->normalizeFilterValues($request, 'client_id'),
            'project_id' => $this->normalizeFilterValues($request, 'project_id'),
            'creator_id' => $this->normalizeFilterValues($request, 'creator_id'),
            'status' => $this->normalizeFilterValues($request, 'status'),
            'priority' => $this->normalizeFilterValues($request, 'priority'),
            'type' => $this->normalizeFilterValues($request, 'type'),
            'assignee' => $this->normalizeFilterValues($request, 'assignee'),
            'label' => $this->normalizeFilterValues($request, 'label'),
            'due_date_from' => $request->input('due_date_from'),
            'due_date_to' => $request->input('due_date_to'),
            'created_from' => $request->input('created_from'),
            'created_to' => $request->input('created_to'),
            'has_attachments' => $request->input('has_attachments'),
            'has_comments' => $request->input('has_comments'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:title,status,priority,type,due_date,created_at,updated_at,client_name,project_name'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'client_id' => ['array'],
            'client_id.*' => ['string', 'regex:/^\d+$/'],
            'project_id' => ['array'],
            'project_id.*' => ['string', 'regex:/^\d+$/'],
            'creator_id' => ['array'],
            'creator_id.*' => ['string', 'regex:/^\d+$/'],
            'status' => ['array'],
            'status.*' => ['string', 'max:255'],
            'priority' => ['array'],
            'priority.*' => ['string', 'max:255'],
            'type' => ['array'],
            'type.*' => ['string', 'max:255'],
            'assignee' => ['array'],
            'assignee.*' => ['string', 'max:50', 'regex:/^(unassigned|\d+)$/'],
            'label' => ['array'],
            'label.*' => ['string', 'max:255'],
            'due_date_from' => ['nullable', 'date'],
            'due_date_to' => ['nullable', 'date', 'after_or_equal:due_date_from'],
            'created_from' => ['nullable', 'date'],
            'created_to' => ['nullable', 'date', 'after_or_equal:created_from'],
            'has_attachments' => ['nullable', 'in:0,1,true,false,yes,no'],
            'has_comments' => ['nullable', 'in:0,1,true,false,yes,no'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();

        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $clientIdFilter = $this->cleanFilterValues($validated['client_id'] ?? []);
        $projectIdFilter = $this->cleanFilterValues($validated['project_id'] ?? []);
        $creatorIdFilter = $this->cleanFilterValues($validated['creator_id'] ?? []);
        $statusFilter = $this->cleanFilterValues($validated['status'] ?? []);
        $priorityFilter = $this->cleanFilterValues($validated['priority'] ?? []);
        $typeFilter = $this->cleanFilterValues($validated['type'] ?? []);
        $assigneeFilter = $this->cleanFilterValues($validated['assignee'] ?? []);
        $labelFilter = $this->cleanFilterValues($validated['label'] ?? []);
        $dueDateFrom = (string) ($validated['due_date_from'] ?? '');
        $dueDateTo = (string) ($validated['due_date_to'] ?? '');
        $createdFrom = (string) ($validated['created_from'] ?? '');
        $createdTo = (string) ($validated['created_to'] ?? '');
        $hasAttachments = $this->parseBoolFilter($validated['has_attachments'] ?? null);
        $hasComments = $this->parseBoolFilter($validated['has_comments'] ?? null);

        $user = $request->user();
        $user->loadMissing('clientMemberships:id,user_id');

        $issues = Issue::query()
            ->select('issues.*')
            ->with([
                'project:id,name,client_id',
                'project.client:id,name',
                'assignee:id,name,avatar_path',
                'creator:id,name,avatar_path',
            ])
            ->withCount(['comments', 'attachments'])
            // @todo non-platform-owner access: plug Issue::visibleTo($user) scope here.
            ->when(! $user->isPlatformOwner(), fn (Builder $q) => $q->whereRaw('0 = 1'))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $like = "%{$search}%";
                $query->where(function (Builder $q) use ($like): void {
                    $q->where('issues.title', 'like', $like)
                        ->orWhere('issues.description', 'like', $like)
                        ->orWhere('issues.status', 'like', $like)
                        ->orWhere('issues.priority', 'like', $like)
                        ->orWhere('issues.type', 'like', $like)
                        ->orWhereHas('assignee', fn (Builder $aq) => $aq->where('name', 'like', $like))
                        ->orWhereHas('project', function (Builder $pq) use ($like): void {
                            $pq->where('name', 'like', $like)
                                ->orWhereHas('client', fn (Builder $cq) => $cq->where('name', 'like', $like));
                        });
                });
            })
            ->when(
                $clientIdFilter !== [],
                fn (Builder $q) => $q->whereHas('project', fn (Builder $pq) => $pq->whereIn('client_id', array_map('intval', $clientIdFilter)))
            )
            ->when(
                $projectIdFilter !== [],
                fn (Builder $q) => $q->whereIn('issues.project_id', array_map('intval', $projectIdFilter))
            )
            ->when(
                $creatorIdFilter !== [],
                fn (Builder $q) => $q->whereIn('issues.creator_id', array_map('intval', $creatorIdFilter))
            )
            ->when($statusFilter !== [], fn (Builder $q) => $q->whereIn('issues.status', $statusFilter))
            ->when($priorityFilter !== [], fn (Builder $q) => $q->whereIn('issues.priority', $priorityFilter))
            ->when($typeFilter !== [], fn (Builder $q) => $q->whereIn('issues.type', $typeFilter))
            ->when($labelFilter !== [], fn (Builder $q) => $q->whereIn('issues.label', $labelFilter))
            ->when($assigneeFilter !== [], function (Builder $query) use ($assigneeFilter): void {
                $ids = collect($assigneeFilter)
                    ->filter(fn (string $v) => ctype_digit($v))
                    ->map(fn (string $v) => (int) $v)
                    ->values();
                $includesUnassigned = in_array('unassigned', $assigneeFilter, true);

                $query->where(function (Builder $aq) use ($ids, $includesUnassigned): void {
                    if ($includesUnassigned) {
                        $aq->whereNull('issues.assignee_id');
                    }
                    if ($ids->isNotEmpty()) {
                        $method = $includesUnassigned ? 'orWhereIn' : 'whereIn';
                        $aq->{$method}('issues.assignee_id', $ids->all());
                    }
                });
            })
            ->when($dueDateFrom !== '', fn (Builder $q) => $q->whereDate('issues.due_date', '>=', $dueDateFrom))
            ->when($dueDateTo !== '', fn (Builder $q) => $q->whereDate('issues.due_date', '<=', $dueDateTo))
            ->when($createdFrom !== '', fn (Builder $q) => $q->where('issues.created_at', '>=', $createdFrom))
            ->when($createdTo !== '', fn (Builder $q) => $q->where('issues.created_at', '<=', $createdTo.' 23:59:59'))
            ->when($hasAttachments === true, fn (Builder $q) => $q->whereHas('attachments'))
            ->when($hasAttachments === false, fn (Builder $q) => $q->whereDoesntHave('attachments'))
            ->when($hasComments === true, fn (Builder $q) => $q->whereHas('comments'))
            ->when($hasComments === false, fn (Builder $q) => $q->whereDoesntHave('comments'));

        $this->applyIssueSort($issues, $sortBy, $sortDirection);

        $paginator = $issues->paginate(15)->withQueryString();

        $items = collect($paginator->items())
            ->map(fn (Issue $issue) => $this->serializeTrackingIssue($issue, $user))
            ->all();

        return Inertia::render('tracking/issues', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->crumb('Tracking', '/tracking/issues'),
                $this->crumb('Issues', '/tracking/issues'),
            ),
            'issues' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
                'client_id' => $clientIdFilter,
                'project_id' => $projectIdFilter,
                'creator_id' => $creatorIdFilter,
                'status' => $statusFilter,
                'priority' => $priorityFilter,
                'type' => $typeFilter,
                'assignee' => $assigneeFilter,
                'label' => $labelFilter,
                'due_date_from' => $dueDateFrom,
                'due_date_to' => $dueDateTo,
                'created_from' => $createdFrom,
                'created_to' => $createdTo,
                'has_attachments' => $validated['has_attachments'] ?? '',
                'has_comments' => $validated['has_comments'] ?? '',
            ],
            'client_filter_options' => $this->issueClientFilterOptions(),
            'project_filter_options' => $this->issueProjectFilterOptions(),
            'status_filter_options' => $this->distinctIssueColumnOptions('status', ['todo', 'in_progress', 'done']),
            'priority_filter_options' => $this->distinctIssueColumnOptions('priority', ['low', 'medium', 'high']),
            'type_filter_options' => $this->distinctIssueColumnOptions('type', ['task', 'bug', 'feature']),
            'assignee_filter_options' => $this->issueAssigneeFilterOptions(),
            'creator_filter_options' => $this->issueCreatorFilterOptions(),
            'label_filter_options' => $this->issueLabelFilterOptions(),
        ]);
    }

    public function boards(Request $request): Response
    {
        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'client_id' => $this->normalizeFilterValues($request, 'client_id'),
            'project_id' => $this->normalizeFilterValues($request, 'project_id'),
            'created_by' => $this->normalizeFilterValues($request, 'created_by'),
            'created_from' => $request->input('created_from'),
            'created_to' => $request->input('created_to'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:name,client_name,project_name,columns_count,placements_count,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'client_id' => ['array'],
            'client_id.*' => ['string', 'regex:/^\d+$/'],
            'project_id' => ['array'],
            'project_id.*' => ['string', 'regex:/^\d+$/'],
            'created_by' => ['array'],
            'created_by.*' => ['string', 'regex:/^\d+$/'],
            'created_from' => ['nullable', 'date'],
            'created_to' => ['nullable', 'date', 'after_or_equal:created_from'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();

        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $clientIdFilter = $this->cleanFilterValues($validated['client_id'] ?? []);
        $projectIdFilter = $this->cleanFilterValues($validated['project_id'] ?? []);
        $creatorFilter = $this->cleanFilterValues($validated['created_by'] ?? []);
        $createdFrom = (string) ($validated['created_from'] ?? '');
        $createdTo = (string) ($validated['created_to'] ?? '');

        $user = $request->user();
        $user->loadMissing('clientMemberships:id,user_id');

        $boards = Board::query()
            ->select('boards.*')
            ->with([
                'project:id,name,client_id',
                'project.client:id,name',
                'creator:id,name,avatar_path',
            ])
            ->withCount(['columns', 'placements'])
            // @todo non-platform-owner access: plug Board::visibleTo($user) scope here.
            ->when(! $user->isPlatformOwner(), fn (Builder $q) => $q->whereRaw('0 = 1'))
            ->when($search !== '', function (Builder $query) use ($search): void {
                $like = "%{$search}%";
                $query->where(function (Builder $q) use ($like): void {
                    $q->where('boards.name', 'like', $like)
                        ->orWhereHas('project', function (Builder $pq) use ($like): void {
                            $pq->where('name', 'like', $like)
                                ->orWhereHas('client', fn (Builder $cq) => $cq->where('name', 'like', $like));
                        })
                        ->orWhereHas('creator', fn (Builder $uq) => $uq->where('name', 'like', $like));
                });
            })
            ->when(
                $clientIdFilter !== [],
                fn (Builder $q) => $q->whereHas('project', fn (Builder $pq) => $pq->whereIn('client_id', array_map('intval', $clientIdFilter)))
            )
            ->when(
                $projectIdFilter !== [],
                fn (Builder $q) => $q->whereIn('boards.project_id', array_map('intval', $projectIdFilter))
            )
            ->when(
                $creatorFilter !== [],
                fn (Builder $q) => $q->whereIn('boards.created_by', array_map('intval', $creatorFilter))
            )
            ->when($createdFrom !== '', fn (Builder $q) => $q->where('boards.created_at', '>=', $createdFrom))
            ->when($createdTo !== '', fn (Builder $q) => $q->where('boards.created_at', '<=', $createdTo.' 23:59:59'));

        $this->applyBoardSort($boards, $sortBy, $sortDirection);

        $paginator = $boards->paginate(15)->withQueryString();

        $items = collect($paginator->items())
            ->map(fn (Board $board) => $this->serializeTrackingBoard($board, $user))
            ->all();

        return Inertia::render('tracking/boards', [
            'breadcrumbs' => $this->breadcrumbs(
                $this->crumb('Tracking', '/tracking/issues'),
                $this->crumb('Boards', '/tracking/boards'),
            ),
            'boards' => $items,
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
                'client_id' => $clientIdFilter,
                'project_id' => $projectIdFilter,
                'created_by' => $creatorFilter,
                'created_from' => $createdFrom,
                'created_to' => $createdTo,
            ],
            'client_filter_options' => $this->issueClientFilterOptions(),
            'project_filter_options' => $this->issueProjectFilterOptions(),
            'creator_filter_options' => $this->boardCreatorFilterOptions(),
        ]);
    }

    public function bulkUpdateIssues(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'issue_ids' => ['required', 'array', 'min:1'],
            'issue_ids.*' => ['integer', Rule::exists('issues', 'id')],
            'status' => ['sometimes', 'string', 'max:255'],
            'priority' => ['sometimes', 'string', 'max:255'],
            'assignee_id' => ['sometimes', 'nullable', 'string', 'max:50', 'regex:/^(unassigned|\d+)$/'],
        ]);

        $updates = [];
        if (array_key_exists('status', $validated)) {
            $updates['status'] = $validated['status'];
        }
        if (array_key_exists('priority', $validated)) {
            $updates['priority'] = $validated['priority'];
        }
        if (array_key_exists('assignee_id', $validated)) {
            $raw = $validated['assignee_id'];
            $updates['assignee_id'] = ($raw === null || $raw === 'unassigned') ? null : (int) $raw;
        }

        if ($updates === []) {
            return back()->withErrors(['form' => 'Select at least one field to update.']);
        }

        Issue::query()->whereIn('id', $validated['issue_ids'])->update($updates);

        return back()->with('success', 'Issues updated.');
    }

    public function bulkDeleteIssues(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'issue_ids' => ['required', 'array', 'min:1'],
            'issue_ids.*' => ['integer', Rule::exists('issues', 'id')],
        ]);

        Issue::query()->whereIn('id', $validated['issue_ids'])->delete();

        return back()->with('success', 'Issues deleted.');
    }

    public function bulkDeleteBoards(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'board_ids' => ['required', 'array', 'min:1'],
            'board_ids.*' => ['integer', Rule::exists('boards', 'id')],
        ]);

        Board::query()->whereIn('id', $validated['board_ids'])->delete();

        return back()->with('success', 'Boards deleted.');
    }

    // ─── Sort ─────────────────────────────────────────────────────

    private function applyIssueSort(Builder $query, string $sortBy, string $sortDirection): void
    {
        $simple = ['title', 'status', 'priority', 'type', 'due_date', 'created_at', 'updated_at'];

        if (in_array($sortBy, $simple, true)) {
            $query->orderBy("issues.{$sortBy}", $sortDirection);
        } elseif ($sortBy === 'project_name') {
            $query->orderBy(
                Project::query()
                    ->select('projects.name')
                    ->whereColumn('projects.id', 'issues.project_id')
                    ->limit(1),
                $sortDirection,
            );
        } elseif ($sortBy === 'client_name') {
            $query->orderBy(
                Client::query()
                    ->select('clients.name')
                    ->join('projects', 'projects.client_id', '=', 'clients.id')
                    ->whereColumn('projects.id', 'issues.project_id')
                    ->limit(1),
                $sortDirection,
            );
        } else {
            $query->orderBy('issues.created_at', 'desc');
        }

        $query->orderBy('issues.id', $sortDirection);
    }

    private function applyBoardSort(Builder $query, string $sortBy, string $sortDirection): void
    {
        if (in_array($sortBy, ['name', 'created_at'], true)) {
            $query->orderBy("boards.{$sortBy}", $sortDirection);
        } elseif (in_array($sortBy, ['columns_count', 'placements_count'], true)) {
            $query->orderBy($sortBy, $sortDirection);
        } elseif ($sortBy === 'project_name') {
            $query->orderBy(
                Project::query()
                    ->select('projects.name')
                    ->whereColumn('projects.id', 'boards.project_id')
                    ->limit(1),
                $sortDirection,
            );
        } elseif ($sortBy === 'client_name') {
            $query->orderBy(
                Client::query()
                    ->select('clients.name')
                    ->join('projects', 'projects.client_id', '=', 'clients.id')
                    ->whereColumn('projects.id', 'boards.project_id')
                    ->limit(1),
                $sortDirection,
            );
        } else {
            $query->orderBy('boards.created_at', 'desc');
        }

        $query->orderBy('boards.id', $sortDirection);
    }

    // ─── Serialization ────────────────────────────────────────────

    private function serializeTrackingBoard(Board $board, User $user): array
    {
        $project = $board->project;
        $client = $project?->client;

        return [
            'id' => $board->id,
            'name' => $board->name,
            'columns_count' => (int) $board->columns_count,
            'placements_count' => (int) $board->placements_count,
            'created_at' => $board->created_at?->toISOString(),
            'updated_at' => $board->updated_at?->toISOString(),
            'creator' => $board->creator ? [
                'id' => $board->creator->id,
                'name' => $board->creator->name,
                'avatar_path' => $board->creator->avatar_path,
            ] : null,
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
            ] : null,
            'client' => $client ? [
                'id' => $client->id,
                'name' => $client->name,
            ] : null,
            'show_url' => $project && $client
                ? "/clients/{$client->id}/projects/{$project->id}/boards/{$board->id}"
                : null,
            'edit_url' => $client
                ? "/clients/{$client->id}/boards/{$board->id}/edit"
                : null,
            'can_manage' => $user->isPlatformOwner() || $user->workspaceAccess()->canManageBoard($board),
        ];
    }

    private function serializeTrackingIssue(Issue $issue, User $user): array
    {
        $project = $issue->project;
        $client = $project?->client;

        return [
            'id' => $issue->id,
            'title' => $issue->title,
            'description' => $issue->description,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'type' => $issue->type,
            'label' => $issue->label,
            'due_date' => $issue->due_date?->toDateString(),
            'created_at' => $issue->created_at?->toISOString(),
            'updated_at' => $issue->updated_at?->toISOString(),
            'comments_count' => (int) $issue->comments_count,
            'attachments_count' => (int) $issue->attachments_count,
            'assignee' => $issue->assignee ? [
                'id' => $issue->assignee->id,
                'name' => $issue->assignee->name,
                'avatar_path' => $issue->assignee->avatar_path,
            ] : null,
            'creator' => $issue->creator ? [
                'id' => $issue->creator->id,
                'name' => $issue->creator->name,
                'avatar_path' => $issue->creator->avatar_path,
            ] : null,
            'project' => $project ? [
                'id' => $project->id,
                'name' => $project->name,
            ] : null,
            'client' => $client ? [
                'id' => $client->id,
                'name' => $client->name,
            ] : null,
            'show_url' => $project && $client
                ? "/clients/{$client->id}/projects/{$project->id}/issues/{$issue->id}"
                : null,
            'edit_url' => $project && $client
                ? "/clients/{$client->id}/projects/{$project->id}/issues/{$issue->id}/edit"
                : null,
            'can_manage' => $project ? $user->workspaceAccess()->canManageIssues($project) : false,
        ];
    }

    // ─── Filter options ───────────────────────────────────────────

    private function issueClientFilterOptions(): array
    {
        return Client::query()
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Client $c) => ['label' => $c->name, 'value' => (string) $c->id])
            ->all();
    }

    private function issueProjectFilterOptions(): array
    {
        return Project::query()
            ->with('client:id,name')
            ->orderBy('name')
            ->get(['id', 'name', 'client_id'])
            ->map(fn (Project $p) => [
                'label' => $p->client?->name ? "{$p->client->name} / {$p->name}" : $p->name,
                'value' => (string) $p->id,
                'client_id' => (string) $p->client_id,
            ])
            ->all();
    }

    private function distinctIssueColumnOptions(string $column, array $defaults): array
    {
        $values = Issue::query()
            ->whereNotNull($column)
            ->where($column, '!=', '')
            ->distinct()
            ->orderBy($column)
            ->pluck($column)
            ->map(fn ($v) => (string) $v)
            ->merge($defaults)
            ->unique()
            ->values();

        return $values
            ->map(fn (string $v) => [
                'label' => Str::headline(str_replace('_', ' ', $v)),
                'value' => $v,
            ])
            ->all();
    }

    private function issueAssigneeFilterOptions(): array
    {
        $ids = Issue::query()
            ->whereNotNull('assignee_id')
            ->distinct()
            ->pluck('assignee_id');

        $options = User::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $u) => ['label' => $u->name, 'value' => (string) $u->id])
            ->all();

        array_unshift($options, ['label' => 'Unassigned', 'value' => 'unassigned']);

        return $options;
    }

    private function issueCreatorFilterOptions(): array
    {
        $ids = Issue::query()
            ->whereNotNull('creator_id')
            ->distinct()
            ->pluck('creator_id');

        return User::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $u) => ['label' => $u->name, 'value' => (string) $u->id])
            ->all();
    }

    private function issueLabelFilterOptions(): array
    {
        return Issue::query()
            ->whereNotNull('label')
            ->where('label', '!=', '')
            ->distinct()
            ->orderBy('label')
            ->pluck('label')
            ->map(fn (string $l) => ['label' => $l, 'value' => $l])
            ->values()
            ->all();
    }

    private function boardCreatorFilterOptions(): array
    {
        $ids = Board::query()
            ->whereNotNull('created_by')
            ->distinct()
            ->pluck('created_by');

        return User::query()
            ->whereIn('id', $ids)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $u) => ['label' => $u->name, 'value' => (string) $u->id])
            ->all();
    }

    // ─── Helpers ──────────────────────────────────────────────────

    private function parseBoolFilter(mixed $raw): ?bool
    {
        if ($raw === null || $raw === '') {
            return null;
        }

        return in_array(strtolower((string) $raw), ['1', 'true', 'yes'], true);
    }

    private function normalizeFilterValues(Request $request, string $key): array
    {
        return Arr::wrap($request->input($key));
    }

    private function cleanFilterValues(array $values): array
    {
        return collect($values)
            ->filter(fn ($v) => is_scalar($v))
            ->map(fn ($v) => trim((string) $v))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }
}
