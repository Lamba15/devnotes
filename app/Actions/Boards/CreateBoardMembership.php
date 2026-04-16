<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardMembership;
use App\Models\ClientMembership;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

class CreateBoardMembership
{
    public function handle(
        User $actor,
        Board $board,
        int $userId,
        string $source = 'manual_ui',
    ): BoardMembership {
        $board->loadMissing('project.client');

        if (! $actor->canManageProject($board->project) && ! $actor->canManageBoard($board)) {
            throw new AuthorizationException('You are not allowed to manage members on this board.');
        }

        $clientId = $board->project->client_id;

        if (! ClientMembership::query()->where('client_id', $clientId)->where('user_id', $userId)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => 'This user does not belong to the client workspace.',
            ]);
        }

        if (BoardMembership::query()->where('board_id', $board->id)->where('user_id', $userId)->exists()) {
            throw ValidationException::withMessages([
                'user_id' => 'This user is already a member of this board.',
            ]);
        }

        $membership = BoardMembership::query()->create([
            'board_id' => $board->id,
            'user_id' => $userId,
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.member.added',
            'source' => $source,
            'subject_type' => BoardMembership::class,
            'subject_id' => $membership->id,
            'metadata_json' => [
                'board_id' => $board->id,
                'board_name' => $board->name,
                'added_user_id' => $userId,
            ],
        ]);

        return $membership->load('user:id,name,email');
    }
}
