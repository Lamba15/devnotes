<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteIssue
{
    public function handle(User $actor, Issue $issue, string $source = 'manual_ui'): void
    {
        if (! $actor->canManageIssues($issue->project)) {
            throw new AuthorizationException('You are not allowed to delete this issue.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.deleted',
            'source' => $source,
            'subject_type' => Issue::class,
            'subject_id' => $issue->id,
            'before_json' => [
                'title' => $issue->title,
                'description' => $issue->description,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'assignee_id' => $issue->assignee_id,
            ],
        ]);

        $issue->comments()->delete();
        $issue->delete();
    }
}
