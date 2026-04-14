<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\CreateIssue;
use App\Actions\Tracking\DeleteIssue;
use App\Actions\Tracking\UpdateIssue;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Board;
use App\Models\Client;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class IssueController extends Controller
{
    public function create(Request $request, Client $client, Project $project): Response
    {
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->canManageIssues($project), 403);

        return Inertia::render('issues/create', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'return_to' => $this->resolveReturnTarget($request, $client, $project),
            'assignee_options' => $this->serializeAssigneeOptions($project),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
        ]);
    }

    public function index(Request $request, Client $client, Project $project): Response
    {
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->hasProjectAccess($project), 403);

        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'assignee' => $this->normalizeFilterValues($request, 'assignee'),
            'status' => $this->normalizeFilterValues($request, 'status'),
            'priority' => $this->normalizeFilterValues($request, 'priority'),
            'type' => $this->normalizeFilterValues($request, 'type'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:title,status,priority,type,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'assignee' => ['array'],
            'assignee.*' => ['string', 'max:50', 'regex:/^(unassigned|\d+)$/'],
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
        $assignee = $this->cleanFilterValues($validated['assignee'] ?? []);
        $status = $this->cleanFilterValues($validated['status'] ?? []);
        $priority = $this->cleanFilterValues($validated['priority'] ?? []);
        $type = $this->cleanFilterValues($validated['type'] ?? []);

        $issues = $project->issues()
            ->with([
                'assignee:id,name',
                'attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
                'comments.user:id,name,avatar_path',
            ])
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($issueQuery) use ($search): void {
                    $issueQuery->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhere('priority', 'like', "%{$search}%")
                        ->orWhere('type', 'like', "%{$search}%")
                        ->orWhereHas('assignee', fn (Builder $assigneeQuery) => $assigneeQuery->where('name', 'like', "%{$search}%"));
                });
            })
            ->when($assignee !== [], function (Builder $query) use ($assignee): void {
                $assigneeIds = collect($assignee)
                    ->filter(fn (string $value) => ctype_digit($value))
                    ->map(fn (string $value) => (int) $value)
                    ->values();
                $includesUnassigned = in_array('unassigned', $assignee, true);

                $query->where(function (Builder $assigneeQuery) use ($assigneeIds, $includesUnassigned): void {
                    if ($includesUnassigned) {
                        $assigneeQuery->whereNull('assignee_id');
                    }

                    if ($assigneeIds->isNotEmpty()) {
                        $method = $includesUnassigned ? 'orWhereIn' : 'whereIn';
                        $assigneeQuery->{$method}('assignee_id', $assigneeIds->all());
                    }
                });
            })
            ->when($status !== [], fn (Builder $query) => $query->whereIn('status', $status))
            ->when($priority !== [], fn (Builder $query) => $query->whereIn('priority', $priority))
            ->when($type !== [], fn (Builder $query) => $query->whereIn('type', $type))
            ->orderBy($sortBy, $sortDirection)
            ->paginate(8)
            ->withQueryString();

        return Inertia::render('issues/index', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'issues' => collect($issues->items())
                ->map(fn (Issue $issue) => $this->serializeIssue($issue, $request->user()->canCommentOnIssue($issue)))
                ->all(),
            'pagination' => [
                'current_page' => $issues->currentPage(),
                'last_page' => $issues->lastPage(),
                'per_page' => $issues->perPage(),
                'total' => $issues->total(),
            ],
            'can_manage_issues' => $request->user()->canManageIssues($project),
            'assignee_filter_options' => $this->serializeIssueAssigneeFilterOptions($project),
            'status_filter_options' => $this->serializeIssueClassificationFilterOptions(
                $project,
                'status',
                ['todo', 'in_progress', 'done'],
                $status,
            ),
            'priority_filter_options' => $this->serializeIssueClassificationFilterOptions(
                $project,
                'priority',
                ['low', 'medium', 'high'],
                $priority,
            ),
            'type_filter_options' => $this->serializeIssueClassificationFilterOptions(
                $project,
                'type',
                ['task', 'bug', 'feature'],
                $type,
            ),
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
                'assignee' => $assignee,
                'status' => $status,
                'priority' => $priority,
                'type' => $type,
            ],
        ]);
    }

    public function store(
        Request $request,
        Client $client,
        Project $project,
        CreateIssue $createIssue,
    ): RedirectResponse {
        abort_unless($project->client_id === $client->id, 404);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'string', 'max:255'],
            'priority' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'assignee_id' => ['nullable', 'integer', Rule::in($this->availableAssigneeIds($project)->all())],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
            'return_to' => ['nullable', 'string', 'max:2048'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $issue = $createIssue->handle($request->user(), $project, $validated);
        $this->storeAttachments($request, $issue);

        if ($returnTarget = $this->resolveReturnTarget($request, $client, $project)) {
            return redirect()->to($returnTarget['href']);
        }

        return to_route('clients.projects.issues.index', [$client, $project]);
    }

    public function edit(Request $request, Client $client, Project $project, Issue $issue): Response
    {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );
        abort_unless($request->user()->canManageIssues($project), 403);

        return Inertia::render('issues/edit', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'issue' => $this->serializeIssue($issue, $request->user()->canCommentOnIssue($issue)),
            'assignee_options' => $this->serializeAssigneeOptions($project, $issue),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
        ]);
    }

    public function show(Request $request, Client $client, Project $project, Issue $issue): Response
    {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );
        abort_unless($request->user()->hasProjectAccess($project), 403);

        return Inertia::render('issues/show', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'issue' => $this->serializeIssue($issue, $request->user()->canCommentOnIssue($issue)),
            'return_to' => $this->resolveReturnTarget($request, $client, $project),
            'can_manage_issue' => $request->user()->canManageIssues($project),
            'can_comment' => $request->user()->canCommentOnIssue($issue),
            'comments' => $this->serializeComments($issue),
            'attachments' => $issue->attachments()
                ->orderBy('id')
                ->get()
                ->map(fn (Attachment $attachment) => $this->serializeAttachment($attachment))
                ->all(),
            'assignee_options' => $this->serializeAssigneeOptions($project, $issue),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
        ]);
    }

    public function workspace(Request $request, Client $client, Project $project, Issue $issue): JsonResponse
    {
        abort_unless($project->client_id === $client->id && $issue->project_id === $project->id, 404);
        abort_unless($request->user()->hasProjectAccess($project), 403);

        return response()->json([
            'issue' => $this->serializeIssue($issue, $request->user()->canCommentOnIssue($issue)),
        ]);
    }

    public function update(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        UpdateIssue $updateIssue,
    ): RedirectResponse|JsonResponse {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status' => ['required', 'string', 'max:255'],
            'priority' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'assignee_id' => ['nullable', 'integer', Rule::in($this->availableAssigneeIds($project, $issue)->all())],
            'due_date' => ['nullable', 'date'],
            'estimated_hours' => ['nullable', 'string', 'max:255'],
            'label' => ['nullable', 'string', 'max:255'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $issue = $updateIssue->handle($request->user(), $issue, $validated);
        $this->storeAttachments($request, $issue);

        if ($request->expectsJson()) {
            return response()->json([
                'issue' => $this->serializeIssue($issue->fresh(), $request->user()->canCommentOnIssue($issue)),
            ]);
        }

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }

    public function destroy(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        DeleteIssue $deleteIssue,
    ): RedirectResponse {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );

        $returnTarget = $this->resolveReturnTarget($request, $client, $project);

        $deleteIssue->handle($request->user(), $issue);

        if ($returnTarget) {
            return redirect()->to($returnTarget['href']);
        }

        return to_route('clients.projects.issues.index', [$client, $project]);
    }

    private function serializeIssue(Issue $issue, bool $canComment = false): array
    {
        $issue->loadMissing([
            'assignee:id,name,avatar_path',
            'attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
            'comments.user:id,name,avatar_path',
            'comments.attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
        ]);

        $attachments = $issue->attachments
            ->sortBy('id')
            ->map(fn (Attachment $attachment) => $this->serializeAttachment($attachment))
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
            'assignee' => $issue->assignee?->only(['id', 'name', 'avatar_path']),
            'due_date' => $issue->due_date?->toDateString(),
            'estimated_hours' => $issue->estimated_hours,
            'label' => $issue->label,
            'created_at' => $issue->created_at?->toISOString(),
            'updated_at' => $issue->updated_at?->toISOString(),
            'attachments' => $attachments->all(),
            'attachment_count' => $attachments->count(),
            'image_count' => $images->count(),
            'file_count' => $attachments->count() - $images->count(),
            'preview_image_url' => $images->first()['url'] ?? null,
            'comments' => $this->buildCommentTree($issue->comments, null),
            'comments_count' => $issue->comments->count(),
            'can_comment' => $canComment,
        ];
    }

    private function resolveReturnTarget(
        Request $request,
        Client $client,
        Project $project,
    ): ?array {
        $returnTo = $request->input('return_to', $request->query('return_to'));

        if (is_string($returnTo)) {
            $returnTo = trim($returnTo);

            if ($returnTo !== '' && str_starts_with($returnTo, '/') && ! str_starts_with($returnTo, '//')) {
                return [
                    'href' => $returnTo,
                    'label' => 'Back',
                ];
            }
        }

        $boardId = $request->query('board_id');

        if (! is_scalar($boardId) || ! ctype_digit((string) $boardId)) {
            return null;
        }

        $board = Board::query()->find((int) $boardId);

        if (! $board || $board->project_id !== $project->id || ! $request->user()->canAccessBoard($board)) {
            return null;
        }

        return [
            'href' => route('clients.projects.boards.show', [
                'client' => $client,
                'project' => $project,
                'board' => $board,
            ], false),
            'label' => 'Back to board',
        ];
    }

    private function serializeAttachment(Attachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'file_name' => $attachment->file_name,
            'file_path' => $attachment->file_path,
            'mime_type' => $attachment->mime_type,
            'file_size' => $attachment->file_size,
            'url' => asset('storage/'.$attachment->file_path),
            'is_image' => $attachment->isImage(),
        ];
    }

    private function storeAttachments(Request $request, Issue $issue): Collection
    {
        if (! $request->hasFile('attachments')) {
            return collect();
        }

        $attachments = collect();

        foreach ($request->file('attachments') as $file) {
            $path = $file->store('attachments', 'public');

            $attachment = Attachment::query()->create([
                'attachable_type' => $issue->getMorphClass(),
                'attachable_id' => $issue->id,
                'uploaded_by' => $request->user()->id,
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
            ]);

            AuditLog::query()->create([
                'user_id' => $request->user()->id,
                'event' => 'attachment.uploaded',
                'source' => 'web',
                'subject_type' => Attachment::class,
                'subject_id' => $attachment->id,
                'after_json' => [
                    'file_name' => $attachment->file_name,
                    'mime_type' => $attachment->mime_type,
                    'attachable_type' => 'issue',
                    'attachable_id' => $issue->id,
                ],
            ]);

            $attachments->push($attachment);
        }

        return $attachments;
    }

    private function serializeAssigneeOptions(Project $project, ?Issue $issue = null): array
    {
        $options = [['label' => 'Unassigned', 'value' => '']];

        return array_merge(
            $options,
            $this->availableAssignees($project, $issue)
                ->map(fn (User $user) => [
                    'label' => $user->name,
                    'value' => (string) $user->id,
                ])
                ->all(),
        );
    }

    private function serializeIssueAssigneeFilterOptions(Project $project): array
    {
        $assigneeIds = $project->issues()
            ->whereNotNull('assignee_id')
            ->distinct()
            ->pluck('assignee_id')
            ->map(fn ($id) => (int) $id)
            ->values();

        $assignees = User::query()
            ->whereIn('id', $assigneeIds)
            ->orderBy('name')
            ->get(['id', 'name']);

        return array_merge(
            [['label' => 'Unassigned', 'value' => 'unassigned']],
            $assignees
                ->map(fn (User $user) => [
                    'label' => $user->name,
                    'value' => (string) $user->id,
                ])
                ->all(),
        );
    }

    private function serializeIssueClassificationFilterOptions(
        Project $project,
        string $column,
        array $defaults,
        array $selectedValues = [],
    ): array {
        $values = collect($defaults)
            ->merge(
                $project->issues()
                    ->whereNotNull($column)
                    ->distinct()
                    ->orderBy($column)
                    ->pluck($column),
            )
            ->merge($selectedValues)
            ->filter(fn ($value) => filled($value))
            ->map(fn (string $value) => trim($value))
            ->filter()
            ->unique()
            ->values();

        return $values
            ->map(fn (string $value) => [
                'label' => Str::headline(str_replace('_', ' ', $value)),
                'value' => $value,
            ])
            ->all();
    }

    private function normalizeFilterValues(Request $request, string $key): array
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

    private function availableAssigneeIds(Project $project, ?Issue $issue = null): Collection
    {
        return $this->availableAssignees($project, $issue)
            ->pluck('id')
            ->map(fn (int $id) => (string) $id)
            ->values();
    }

    private function availableAssignees(Project $project, ?Issue $issue = null): Collection
    {
        $assigneeQuery = User::query()
            ->whereHas('clientMemberships', function (Builder $query) use ($project): void {
                $query->where('client_id', $project->client_id);
            })
            ->where(function (Builder $query) use ($project): void {
                $query->whereHas('clientMemberships', function (Builder $membershipQuery) use ($project): void {
                    $membershipQuery
                        ->where('client_id', $project->client_id)
                        ->whereIn('role', ['owner', 'admin']);
                })->orWhereHas('projectMemberships', function (Builder $membershipQuery) use ($project): void {
                    $membershipQuery->where('project_id', $project->id);
                });
            });

        if ($issue?->assignee_id !== null) {
            $assigneeQuery->orWhere('id', $issue->assignee_id);
        }

        return $assigneeQuery
            ->orderBy('name')
            ->get(['users.id', 'users.name'])
            ->unique('id')
            ->values();
    }

    private function serializeComments(Issue $issue): array
    {
        $comments = $issue->comments()
            ->with([
                'user:id,name,avatar_path',
                'attachments:id,attachable_id,attachable_type,file_name,file_path,mime_type,file_size',
            ])
            ->orderBy('id')
            ->get();

        return $this->buildCommentTree($comments, null);
    }

    private function buildCommentTree($comments, ?int $parentId): array
    {
        return $comments
            ->where('parent_id', $parentId)
            ->map(fn (IssueComment $comment) => [
                'id' => $comment->id,
                'body' => $comment->body,
                'parent_id' => $comment->parent_id,
                'user' => $comment->user?->only(['id', 'name', 'avatar_path']),
                'created_at' => $comment->created_at?->toISOString(),
                'attachments' => $comment->attachments
                    ->map(fn (Attachment $attachment) => $this->serializeAttachment($attachment))
                    ->values()
                    ->all(),
                'replies' => $this->buildCommentTree($comments, $comment->id),
            ])
            ->values()
            ->all();
    }
}
