<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Arr;
use Illuminate\Validation\ValidationException;

class UpdateBoard
{
    public function __construct(private readonly SyncBoardColumns $syncBoardColumns) {}

    public function handle(User $actor, Board $board, array $attributes, string $source = 'manual_ui'): Board
    {
        $board->loadMissing('project.client');

        if (! $actor->canManageBoard($board)) {
            throw new AuthorizationException('You are not allowed to update boards for this client.');
        }

        if (array_key_exists('project_id', $attributes)) {
            $project = Project::query()
                ->whereKey($attributes['project_id'])
                ->where('client_id', $board->project->client_id)
                ->first();

            if (! $project) {
                throw ValidationException::withMessages([
                    'project_id' => 'The selected project is invalid for this client workspace.',
                ]);
            }

            $attributes['project_id'] = $project->id;
        }

        $board->fill(Arr::only($attributes, ['project_id', 'name']));
        $board->save();

        if (array_key_exists('columns', $attributes)) {
            $this->syncBoardColumns->handle($board, $attributes['columns'] ?? []);
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.updated',
            'source' => $source,
            'subject_type' => Board::class,
            'subject_id' => $board->id,
            'metadata_json' => [
                'client_id' => $board->project->client_id,
                'project_id' => $board->project_id,
            ],
            'after_json' => [
                'id' => $board->id,
                'project_id' => $board->project_id,
                'name' => $board->name,
                'columns_count' => $board->columns()->count(),
            ],
        ]);

        return $board->load('project:id,client_id,name');
    }
}
