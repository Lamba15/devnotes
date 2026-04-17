<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Issue;
use App\Models\Project;
use App\Models\User;
use App\Support\WorkspaceAccess;
use Illuminate\Auth\Access\AuthorizationException;

class CreateIssue
{
    public function handle(
        User $actor,
        Project $project,
        array $attributes,
        string $source = 'manual_ui',
    ): Issue {
        if (! $actor->canManageIssues($project)) {
            throw new AuthorizationException('You are not allowed to create issues for this project.');
        }

        $assigneeIds = $this->resolveAssigneeIds($attributes);

        $issue = Issue::query()->create([
            'project_id' => $project->id,
            'title' => $attributes['title'],
            'description' => $attributes['description'] ?? null,
            'status' => $attributes['status'],
            'priority' => $attributes['priority'],
            'type' => $attributes['type'],
            'due_date' => $attributes['due_date'] ?? null,
            'estimated_hours' => $attributes['estimated_hours'] ?? null,
            'label' => $attributes['label'] ?? null,
            'creator_id' => $actor->id,
        ]);

        $issue->assignees()->sync($assigneeIds);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.created',
            'source' => $source,
            'subject_type' => Issue::class,
            'subject_id' => $issue->id,
            'metadata_json' => [
                'project_id' => $project->id,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
            ],
            'after_json' => [
                'id' => $issue->id,
                'project_id' => $issue->project_id,
                'title' => $issue->title,
                'description' => $issue->description,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'assignee_ids' => $assigneeIds,
                'due_date' => $issue->due_date?->toDateString(),
                'estimated_hours' => $issue->estimated_hours,
                'label' => $issue->label,
            ],
        ]);

        return $issue->fresh(['assignees']);
    }

    /**
     * @return array<int, int>
     */
    private function resolveAssigneeIds(array $attributes): array
    {
        if (array_key_exists('assignee_ids', $attributes)) {
            return collect($attributes['assignee_ids'] ?? [])
                ->map(fn ($id) => (int) $id)
                ->filter()
                ->unique()
                ->values()
                ->all();
        }

        $mainOwner = WorkspaceAccess::mainPlatformOwner();

        return $mainOwner ? [$mainOwner->id] : [];
    }
}
