<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteBoard
{
    public function handle(User $actor, Board $board, string $source = 'manual_ui'): void
    {
        $board->loadMissing('project.client');

        if (! $actor->canManageClient($board->project->client)) {
            throw new AuthorizationException('You are not allowed to delete this board.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.deleted',
            'source' => $source,
            'subject_type' => Board::class,
            'subject_id' => $board->id,
            'metadata_json' => [
                'client_id' => $board->project->client_id,
                'project_id' => $board->project_id,
            ],
            'before_json' => [
                'project_id' => $board->project_id,
                'name' => $board->name,
            ],
        ]);

        $board->delete();
    }
}
