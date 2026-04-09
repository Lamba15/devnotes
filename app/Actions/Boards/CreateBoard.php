<?php

namespace App\Actions\Boards;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\Client;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

class CreateBoard
{
    public function __construct(private readonly SyncBoardColumns $syncBoardColumns) {}

    public function handle(
        User $actor,
        Client $client,
        array $attributes,
        string $source = 'manual_ui',
    ): Board {
        if (! $actor->canManageClient($client)) {
            throw new AuthorizationException('You are not allowed to create boards for this client.');
        }

        $project = Project::query()
            ->whereKey($attributes['project_id'])
            ->where('client_id', $client->id)
            ->first();

        if (! $project) {
            throw ValidationException::withMessages([
                'project_id' => 'The selected project is invalid for this client workspace.',
            ]);
        }

        $board = Board::query()->create([
            'project_id' => $project->id,
            'name' => $attributes['name'],
        ]);

        $this->syncBoardColumns->handle($board, $attributes['columns'] ?? []);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'board.created',
            'source' => $source,
            'subject_type' => Board::class,
            'subject_id' => $board->id,
            'metadata_json' => [
                'client_id' => $client->id,
                'project_id' => $project->id,
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
