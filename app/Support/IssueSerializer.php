<?php

namespace App\Support;

use App\Models\Issue;
use App\Models\User;

class IssueSerializer
{
    /**
     * Serialize the assignees relation for an issue.
     *
     * @return array<int, array{id: int, name: string, avatar_path: string|null, is_main_owner: bool}>
     */
    public static function assignees(Issue $issue, ?int $mainOwnerId = null): array
    {
        $issue->loadMissing('assignees');

        return $issue->assignees
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar_path' => $user->avatar_path,
                'is_main_owner' => $mainOwnerId !== null && $user->id === $mainOwnerId,
            ])
            ->values()
            ->all();
    }
}
