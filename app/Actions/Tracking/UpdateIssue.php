<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateIssue
{
    public function handle(
        User $actor,
        Issue $issue,
        array $attributes,
        string $source = 'manual_ui',
    ): Issue {
        if (! $actor->canManageProject($issue->project)) {
            throw new AuthorizationException('You are not allowed to update this issue.');
        }

        $before = [
            'title' => $issue->title,
            'description' => $issue->description,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'type' => $issue->type,
            'assignee_id' => $issue->assignee_id,
        ];

        $issue->forceFill([
            'title' => $attributes['title'],
            'description' => $attributes['description'] ?? null,
            'status' => $attributes['status'],
            'priority' => $attributes['priority'],
            'type' => $attributes['type'],
            'assignee_id' => $attributes['assignee_id'] ?? null,
        ])->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.updated',
            'source' => $source,
            'subject_type' => Issue::class,
            'subject_id' => $issue->id,
            'before_json' => $before,
            'after_json' => [
                'title' => $issue->title,
                'description' => $issue->description,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'assignee_id' => $issue->assignee_id,
            ],
        ]);

        return $issue->fresh();
    }
}
