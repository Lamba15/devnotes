<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\CreateIssueComment;
use App\Models\Attachment;
use App\Models\AuditLog;
use App\Models\Client;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class IssueCommentController extends Controller
{
    public function store(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        CreateIssueComment $createIssueComment,
    ): RedirectResponse|JsonResponse {
        abort_unless(
            $project->client_id === $client->id && $issue->project_id === $project->id,
            404,
        );

        $validated = $request->validate([
            'body' => ['required', 'string'],
            'parent_id' => ['nullable', 'integer', 'exists:issue_comments,id'],
            'attachments' => ['nullable', 'array', 'max:10'],
            'attachments.*' => ['file', 'max:10240'],
        ]);

        $comment = $createIssueComment->handle($request->user(), $issue, $validated);

        if ($request->hasFile('attachments')) {
            foreach ($request->file('attachments') as $file) {
                $path = $file->store('attachments', 'public');
                Attachment::create([
                    'attachable_type' => $comment->getMorphClass(),
                    'attachable_id' => $comment->id,
                    'uploaded_by' => $request->user()->id,
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                ]);
            }
        }

        if ($request->expectsJson()) {
            return response()->json([
                'comment' => $this->serializeCommentTreeNode($comment->fresh(['user:id,name,avatar_path', 'attachments'])),
            ]);
        }

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }

    public function update(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        IssueComment $comment,
    ): RedirectResponse|JsonResponse {
        abort_unless(
            $project->client_id === $client->id
            && $issue->project_id === $project->id
            && $comment->issue_id === $issue->id,
            404,
        );

        abort_unless($comment->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'body' => ['required', 'string'],
        ]);

        $before = $comment->only(['body']);
        $comment->update($validated);

        AuditLog::create([
            'user_id' => $request->user()->id,
            'event' => 'comment.updated',
            'source' => 'web',
            'subject_type' => $comment->getMorphClass(),
            'subject_id' => $comment->id,
            'before_json' => $before,
            'after_json' => $comment->only(['body']),
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'comment' => $this->serializeCommentTreeNode($comment->fresh(['user:id,name,avatar_path', 'attachments'])),
            ]);
        }

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }

    public function destroy(
        Request $request,
        Client $client,
        Project $project,
        Issue $issue,
        IssueComment $comment,
    ): RedirectResponse|JsonResponse {
        abort_unless(
            $project->client_id === $client->id
            && $issue->project_id === $project->id
            && $comment->issue_id === $issue->id,
            404,
        );

        abort_unless($comment->user_id === $request->user()->id, 403);

        // Delete attachments from storage
        foreach ($comment->attachments as $attachment) {
            Storage::disk('public')->delete($attachment->file_path);
            $attachment->delete();
        }

        // Delete nested replies recursively
        $this->deleteReplies($comment);

        $snapshot = $comment->only(['id', 'body', 'issue_id', 'parent_id']);
        $comment->delete();

        AuditLog::create([
            'user_id' => $request->user()->id,
            'event' => 'comment.deleted',
            'source' => 'web',
            'subject_type' => (new IssueComment)->getMorphClass(),
            'subject_id' => $snapshot['id'],
            'before_json' => $snapshot,
        ]);

        if ($request->expectsJson()) {
            return response()->json([
                'deleted' => true,
                'id' => $snapshot['id'],
            ]);
        }

        return to_route('clients.projects.issues.show', [$client, $project, $issue]);
    }

    private function deleteReplies(IssueComment $comment): void
    {
        foreach ($comment->replies as $reply) {
            foreach ($reply->attachments as $attachment) {
                Storage::disk('public')->delete($attachment->file_path);
                $attachment->delete();
            }
            $this->deleteReplies($reply);
            $reply->delete();
        }
    }

    private function serializeCommentTreeNode(IssueComment $comment): array
    {
        return [
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
            'replies' => [],
        ];
    }
}
