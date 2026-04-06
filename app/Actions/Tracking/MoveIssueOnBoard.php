<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Validation\ValidationException;

class MoveIssueOnBoard
{
    public function handle(
        User $actor,
        Board $board,
        Issue $issue,
        BoardColumn $column,
        string $source = 'manual_ui',
    ): BoardIssuePlacement {
        if (! $actor->canMoveIssueOnBoard($board)) {
            throw new AuthorizationException('You are not allowed to move issues on this board.');
        }

        if ($board->project_id !== $issue->project_id || $column->board_id !== $board->id) {
            throw ValidationException::withMessages([
                'issue_id' => 'The issue or column does not belong to this board context.',
            ]);
        }

        if ($column->updates_status && filled($column->mapped_status)) {
            $issue->forceFill([
                'status' => $column->mapped_status,
            ])->save();
        }

        $nextPosition = (int) $board->placements()
            ->where('column_id', $column->id)
            ->max('position') + 1;

        $placement = BoardIssuePlacement::query()->updateOrCreate(
            [
                'board_id' => $board->id,
                'issue_id' => $issue->id,
            ],
            [
                'column_id' => $column->id,
                'position' => $nextPosition,
            ],
        );

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.moved_on_board',
            'source' => $source,
            'subject_type' => Issue::class,
            'subject_id' => $issue->id,
            'metadata_json' => [
                'board_id' => $board->id,
                'column_id' => $column->id,
            ],
            'after_json' => [
                'issue_id' => $issue->id,
                'board_id' => $board->id,
                'column_id' => $column->id,
                'status' => $issue->status,
            ],
        ]);

        return $placement->load(['issue', 'column', 'board']);
    }
}
