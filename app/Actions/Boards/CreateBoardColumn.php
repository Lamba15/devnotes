<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class CreateBoardColumn
{
    public function handle(User $actor, Board $board, array $attributes, string $source = 'manual_ui'): BoardColumn
    {
        $board->loadMissing('project.client');

        if (! $actor->canManageClient($board->project->client)) {
            throw new AuthorizationException('You are not allowed to add columns to this board.');
        }

        $column = $board->columns()->create([
            'name' => trim((string) $attributes['name']),
            'position' => ((int) $board->columns()->max('position')) + 1,
            'updates_status' => (bool) ($attributes['updates_status'] ?? false),
            'mapped_status' => ($attributes['updates_status'] ?? false)
                ? filled($attributes['mapped_status'] ?? null)
                    ? (string) $attributes['mapped_status']
                    : null
                : null,
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.column_created',
            'source' => $source,
            'subject_type' => BoardColumn::class,
            'subject_id' => $column->id,
            'metadata_json' => [
                'board_id' => $board->id,
                'project_id' => $board->project_id,
            ],
            'after_json' => [
                'id' => $column->id,
                'board_id' => $column->board_id,
                'name' => $column->name,
                'position' => $column->position,
                'updates_status' => $column->updates_status,
                'mapped_status' => $column->mapped_status,
            ],
        ]);

        return $column;
    }
}
