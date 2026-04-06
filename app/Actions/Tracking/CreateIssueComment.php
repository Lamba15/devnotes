<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

class CreateIssueComment
{
    public function handle(
        User $actor,
        Issue $issue,
        array $attributes,
        string $source = 'manual_ui',
    ): IssueComment {
        if (! $actor->canCommentOnIssue($issue)) {
            throw new AuthorizationException('You are not allowed to comment on this issue.');
        }

        $parentId = $attributes['parent_id'] ?? null;

        if ($parentId !== null) {
            $parentComment = IssueComment::query()->findOrFail($parentId);

            if ($parentComment->issue_id !== $issue->id) {
                throw ValidationException::withMessages([
                    'parent_id' => 'The selected parent comment does not belong to this issue.',
                ]);
            }
        }

        $comment = IssueComment::query()->create([
            'issue_id' => $issue->id,
            'user_id' => $actor->id,
            'parent_id' => $parentId,
            'body' => $attributes['body'],
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.comment.created',
            'source' => $source,
            'subject_type' => IssueComment::class,
            'subject_id' => $comment->id,
            'metadata_json' => [
                'issue_id' => $issue->id,
                'parent_id' => $comment->parent_id,
            ],
            'after_json' => [
                'id' => $comment->id,
                'issue_id' => $comment->issue_id,
                'user_id' => $comment->user_id,
                'parent_id' => $comment->parent_id,
                'body' => $comment->body,
            ],
        ]);

        return $comment->fresh();
    }
}
