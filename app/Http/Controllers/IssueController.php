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
use Illuminate\Support\Collection;
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
            'assignee_options' => $this->serializeAssigneeOptions($project),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
        ]);
    }

    public function index(Request $request, Client $client, Project $project): Response
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:title,status,priority,type,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->hasProjectAccess($project), 403);

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
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
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
            'assignee_options' => $this->serializeAssigneeOptions($project),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
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
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $issue = $createIssue->handle($request->user(), $project, $validated);
        $this->storeAttachments($request, $issue);

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
            'return_to' => $this->resolveShowReturnTarget($request, $client, $project),
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

        $deleteIssue->handle($request->user(), $issue);

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

    private function resolveShowReturnTarget(
        Request $request,
        Client $client,
        Project $project,
    ): ?array {
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
