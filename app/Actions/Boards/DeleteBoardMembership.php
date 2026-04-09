<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\BoardMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteBoardMembership
{
    public function handle(User $actor, BoardMembership $membership, string $source = 'manual_ui'): void
    {
        $membership->loadMissing('board.project.client');

        if (! $actor->canManageProject($membership->board->project)) {
            throw new AuthorizationException('You are not allowed to remove members from this board.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.member.removed',
            'source' => $source,
            'subject_type' => BoardMembership::class,
            'subject_id' => $membership->id,
            'metadata_json' => [
                'board_id' => $membership->board_id,
                'board_name' => $membership->board->name,
                'removed_user_id' => $membership->user_id,
            ],
        ]);

        $membership->delete();
    }
}
