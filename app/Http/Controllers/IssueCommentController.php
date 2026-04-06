<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\CreateIssueComment;
use App\Models\Client;
use App\Models\Issue;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class IssueCommentController extends Controller
{
    public function store(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        CreateIssueComment $createIssueComment,
    ): RedirectResponse {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );

        $validated = $request->validate([
            'body' => ['required', 'string'],
            'parent_id' => ['nullable', 'integer', 'exists:issue_comments,id'],
        ]);

        $createIssueComment->handle($request->user(), $issue, $validated);

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }
}
