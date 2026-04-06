<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\CreateIssue;
use App\Actions\Tracking\UpdateIssue;
use App\Models\Client;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IssueController extends Controller
{
    public function index(Request $request, Client $client, Project $project): Response
    {
        abort_unless($project->client_id === $client->id, 404);
        abort_unless($request->user()->hasProjectAccess($project), 403);

        return Inertia::render('issues/index', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'issues' => $project->issues()
                ->latest()
                ->get()
                ->map(fn (Issue $issue) => $this->serializeIssue($issue))
                ->all(),
            'can_manage_issues' => $request->user()->canManageProject($project),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
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
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $createIssue->handle($request->user(), $project, $validated);

        return to_route('clients.projects.issues.index', [$client, $project]);
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
            'issue' => $this->serializeIssue($issue),
            'can_manage_issue' => $request->user()->canManageProject($project),
            'can_comment' => $request->user()->canCommentOnIssue($issue),
            'comments' => $this->serializeComments($issue),
            'status_options' => ['todo', 'in_progress', 'done'],
            'priority_options' => ['low', 'medium', 'high'],
            'type_options' => ['task', 'bug', 'feature'],
        ]);
    }

    public function update(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        UpdateIssue $updateIssue,
    ): RedirectResponse {
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
            'assignee_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $updateIssue->handle($request->user(), $issue, $validated);

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }

    private function serializeIssue(Issue $issue): array
    {
        return [
            'id' => $issue->id,
            'title' => $issue->title,
            'description' => $issue->description,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'type' => $issue->type,
            'assignee_id' => $issue->assignee_id,
        ];
    }

    private function serializeComments(Issue $issue): array
    {
        $comments = $issue->comments()
            ->with('user:id,name')
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
                'user' => $comment->user?->only(['id', 'name']),
                'created_at' => $comment->created_at?->toISOString(),
                'replies' => $this->buildCommentTree($comments, $comment->id),
            ])
            ->values()
            ->all();
    }
}
