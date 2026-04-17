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
        if (! $actor->canManageIssues($issue->project)) {
            throw new AuthorizationException('You are not allowed to update this issue.');
        }

        $issue->loadMissing('assignees');

        $before = [
            'title' => $issue->title,
            'description' => $issue->description,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'type' => $issue->type,
            'assignee_ids' => $issue->assignees->pluck('id')->sort()->values()->all(),
            'due_date' => $issue->due_date?->toDateString(),
            'estimated_hours' => $issue->estimated_hours,
            'label' => $issue->label,
        ];

        $issue->forceFill([
            'title' => $attributes['title'],
            'description' => $attributes['description'] ?? null,
            'status' => $attributes['status'],
            'priority' => $attributes['priority'],
            'type' => $attributes['type'],
            'due_date' => $attributes['due_date'] ?? null,
            'estimated_hours' => $attributes['estimated_hours'] ?? null,
            'label' => $attributes['label'] ?? null,
        ])->save();

        if (array_key_exists('assignee_ids', $attributes)) {
            $assigneeIds = collect($attributes['assignee_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all();
            $issue->assignees()->sync($assigneeIds);
        }

        $issue->load('assignees');

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
                'assignee_ids' => $issue->assignees->pluck('id')->sort()->values()->all(),
                'due_date' => $issue->due_date?->toDateString(),
                'estimated_hours' => $issue->estimated_hours,
                'label' => $issue->label,
            ],
        ]);

        return $issue->fresh(['assignees']);
    }
}
