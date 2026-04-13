<?php

namespace App\Http\Controllers;

use App\Actions\Boards\CreateBoard;
use App\Actions\Boards\CreateBoardColumn;
use App\Actions\Boards\DeleteBoard;
use App\Actions\Boards\UpdateBoard;
use App\Models\Attachment;
use App\Models\Board;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\Issue;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BoardController extends Controller
{
    public function create(Request $request, Client $client): Response
    {
        $user = $request->user();

        abort_unless($user->canManageClient($client), 403);

        return Inertia::render('boards/create', [
            'client' => $client->only(['id', 'name']),
            'projects' => Project::query()
                ->whereBelongsTo($client)
                ->orderBy('name')
                ->get(['id', 'name']),
            'status_options' => ['todo', 'in_progress', 'done'],
        ]);
    }

    public function store(Request $request, Client $client, CreateBoard $createBoard): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'columns' => ['nullable', 'array'],
            'columns.*.name' => ['required', 'string', 'max:255'],
            'columns.*.updates_status' => ['nullable', 'boolean'],
            'columns.*.mapped_status' => ['nullable', 'in:todo,in_progress,done'],
        ]);

        foreach ($validated['columns'] ?? [] as $index => $column) {
            if (($column['updates_status'] ?? false) && ! filled($column['mapped_status'] ?? null)) {
                abort(422, 'Column '.($index + 1).' must choose a status mapping.');
            }
        }

        $createBoard->handle($request->user(), $client, $validated);

        return to_route('clients.boards.index', $client);
    }

    public function edit(Request $request, Client $client, Board $board): Response
    {
        $board->load('project');

        abort_unless($board->project?->client_id === $client->id, 404);
        abort_unless($request->user()->canManageClient($client), 403);

        return Inertia::render('boards/edit', [
            'client' => $client->only(['id', 'name']),
            'board' => [
                'id' => $board->id,
                'name' => $board->name,
                'project_id' => $board->project_id,
                'columns' => $board->columns()
                    ->orderBy('position')
                    ->get(['id', 'name', 'position', 'updates_status', 'mapped_status'])
                    ->all(),
            ],
            'projects' => Project::query()
                ->whereBelongsTo($client)
                ->orderBy('name')
                ->get(['id', 'name']),
            'status_options' => ['todo', 'in_progress', 'done'],
        ]);
    }

    public function update(Request $request, Client $client, Board $board, UpdateBoard $updateBoard): RedirectResponse
    {
        $board->load('project');

        abort_unless($board->project?->client_id === $client->id, 404);

        $validated = $request->validate([
            'project_id' => ['sometimes', 'integer', 'exists:projects,id'],
            'name' => ['required', 'string', 'max:255'],
            'columns' => ['nullable', 'array'],
            'columns.*.id' => ['nullable', 'integer', 'exists:board_columns,id'],
            'columns.*.name' => ['required', 'string', 'max:255'],
            'columns.*.updates_status' => ['nullable', 'boolean'],
            'columns.*.mapped_status' => ['nullable', 'in:todo,in_progress,done'],
        ]);

        foreach ($validated['columns'] ?? [] as $index => $column) {
            if (($column['updates_status'] ?? false) && ! filled($column['mapped_status'] ?? null)) {
                abort(422, 'Column '.($index + 1).' must choose a status mapping.');
            }
        }

        $updateBoard->handle($request->user(), $board, $validated);

        return to_route('clients.boards.index', $client);
    }

    public function destroy(Request $request, Client $client, Board $board, DeleteBoard $deleteBoard): RedirectResponse
    {
        $board->load('project');

        abort_unless($board->project?->client_id === $client->id, 404);

        $deleteBoard->handle($request->user(), $board);

        return to_route('clients.boards.index', $client);
    }

    public function show(Request $request, Client $client, Project $project, Board $board): Response
    {
        abort_unless(
            $board->project_id === $project->id && $project->client_id === $client->id,
            404,
        );

        $user = $request->user();

        abort_unless($user->canAccessBoard($board), 403);

        $this->removeInvalidPlacements($board);

        $board->load([
            'columns' => fn ($query) => $query
                ->orderBy('position')
                ->with([
                    'placements' => fn ($placementQuery) => $placementQuery
                        ->orderBy('position')
                        ->with('issue.attachments', 'issue.comments.user:id,name,avatar_path', 'issue.comments.attachments'),
                ]),
        ]);

        $placedIssueIds = BoardIssuePlacement::query()
            ->where('board_id', $board->id)
            ->pluck('issue_id');

        return Inertia::render('boards/show', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'board' => [
                'id' => $board->id,
                'name' => $board->name,
                'columns_count' => $board->columns->count(),
            ],
            'backlog' => Issue::query()
                ->where('project_id', $project->id)
                ->whereNotIn('id', $placedIssueIds)
                ->with('attachments', 'comments.user:id,name,avatar_path', 'comments.attachments')
                ->orderBy('id')
                ->get()
                ->map(fn (Issue $issue) => $this->serializeIssue($issue))
                ->all(),
            'columns' => $board->columns->map(fn ($column) => [
                'id' => $column->id,
                'name' => $column->name,
                'position' => $column->position,
                'updates_status' => $column->updates_status,
                'mapped_status' => $column->mapped_status,
                'issues_count' => $column->placements->count(),
                'issues' => $column->placements
                    ->map(fn (BoardIssuePlacement $placement) => $this->serializeIssue($placement->issue))
                    ->values()
                    ->all(),
            ])->values()->all(),
            'can_move_issues' => $user->canMoveIssueOnBoard($board),
            'can_create_issues' => $user->canManageIssues($project),
            'can_manage_board' => $user->canManageBoard($board),
            'status_options' => ['todo', 'in_progress', 'done'],
        ]);
    }

    public function storeColumn(
        Request $request,
        Client $client,
        Board $board,
        CreateBoardColumn $createBoardColumn,
    ): RedirectResponse {
        $board->loadMissing('project');

        abort_unless($board->project?->client_id === $client->id, 404);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'updates_status' => ['nullable', 'boolean'],
            'mapped_status' => ['nullable', 'in:todo,in_progress,done'],
        ]);

        if (($validated['updates_status'] ?? false) && ! filled($validated['mapped_status'] ?? null)) {
            abort(422, 'Status-updating columns must choose a mapped status.');
        }

        $createBoardColumn->handle($request->user(), $board, $validated);

        return to_route('clients.projects.boards.show', [
            'client' => $client,
            'project' => $board->project,
            'board' => $board,
        ]);
    }

    private function removeInvalidPlacements(Board $board): void
    {
        BoardIssuePlacement::query()
            ->where('board_id', $board->id)
            ->with(['column', 'issue'])
            ->get()
            ->filter(fn (BoardIssuePlacement $placement) => $placement->column?->updates_status
                && filled($placement->column?->mapped_status)
                && $placement->issue?->status !== $placement->column?->mapped_status)
            ->each(fn (BoardIssuePlacement $placement) => $placement->delete());
    }

    private function serializeIssue(Issue $issue): array
    {
        $issue->loadMissing('attachments');

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
            'attachments' => $attachments->all(),
            'attachment_count' => $attachments->count(),
            'image_count' => $images->count(),
            'file_count' => $attachments->count() - $images->count(),
            'preview_image_url' => $images->first()['url'] ?? null,
            'comments' => $this->buildCommentTree($issue->comments, null),
            'comments_count' => $issue->comments->count(),
            'can_comment' => request()->user()?->canCommentOnIssue($issue) ?? false,
        ];
    }

    private function buildCommentTree($comments, ?int $parentId): array
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
                'replies' => $this->buildCommentTree($comments, $comment->id),
            ])
            ->values()
            ->all();
    }
}
