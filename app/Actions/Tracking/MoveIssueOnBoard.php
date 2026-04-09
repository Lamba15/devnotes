<?php

namespace App\Actions\Tracking;

use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class MoveIssueOnBoard
{
    public function handle(
        User $actor,
        Board $board,
        Issue $issue,
        ?BoardColumn $column,
        int|string|null $position = null,
        string $source = 'manual_ui',
    ): ?BoardIssuePlacement {
        if (! $actor->canMoveIssueOnBoard($board)) {
            throw new AuthorizationException('You are not allowed to move issues on this board.');
        }

        if ($board->project_id !== $issue->project_id || ($column && $column->board_id !== $board->id)) {
            throw ValidationException::withMessages([
                'issue_id' => 'The issue or column does not belong to this board context.',
            ]);
        }

        $targetPosition = $position === null ? null : (int) $position;

        $placement = DB::transaction(function () use ($board, $issue, $column, $targetPosition) {
            $existingPlacement = BoardIssuePlacement::query()
                ->where('board_id', $board->id)
                ->where('issue_id', $issue->id)
                ->first();

            $previousColumnId = $existingPlacement?->column_id;

            if ($column === null) {
                $existingPlacement?->delete();

                if ($previousColumnId !== null) {
                    $this->normalizeColumnPositions($board, $previousColumnId);
                }

                return null;
            }

            if ($column->updates_status && filled($column->mapped_status)) {
                $issue->forceFill([
                    'status' => $column->mapped_status,
                ])->save();
            }

            $siblingIds = BoardIssuePlacement::query()
                ->where('board_id', $board->id)
                ->where('column_id', $column->id)
                ->when($existingPlacement !== null, fn ($query) => $query->where('issue_id', '!=', $issue->id))
                ->orderBy('position')
                ->orderBy('id')
                ->pluck('issue_id')
                ->all();

            $targetPosition = $targetPosition ?? (count($siblingIds) + 1);
            $targetPosition = max(1, min($targetPosition, count($siblingIds) + 1));

            array_splice($siblingIds, $targetPosition - 1, 0, [$issue->id]);

            $placement = BoardIssuePlacement::query()->updateOrCreate(
                [
                    'board_id' => $board->id,
                    'issue_id' => $issue->id,
                ],
                [
                    'column_id' => $column->id,
                    'position' => $targetPosition,
                ],
            );

            foreach ($siblingIds as $index => $siblingIssueId) {
                BoardIssuePlacement::query()
                    ->where('board_id', $board->id)
                    ->where('issue_id', $siblingIssueId)
                    ->update([
                        'column_id' => $column->id,
                        'position' => $index + 1,
                    ]);
            }

            if ($previousColumnId !== null && $previousColumnId !== $column->id) {
                $this->normalizeColumnPositions($board, $previousColumnId);
            }

            return $placement;
        });

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'issue.moved_on_board',
            'source' => $source,
            'subject_type' => Issue::class,
            'subject_id' => $issue->id,
            'metadata_json' => [
                'board_id' => $board->id,
                'column_id' => $column?->id,
                'position' => $placement?->position,
            ],
            'after_json' => [
                'issue_id' => $issue->id,
                'board_id' => $board->id,
                'column_id' => $column?->id,
                'position' => $placement?->position,
                'status' => $issue->status,
            ],
        ]);

        return $placement?->load(['issue', 'column', 'board']);
    }

    private function normalizeColumnPositions(Board $board, int $columnId): void
    {
        BoardIssuePlacement::query()
            ->where('board_id', $board->id)
            ->where('column_id', $columnId)
            ->orderBy('position')
            ->orderBy('id')
            ->get()
            ->values()
            ->each(fn (BoardIssuePlacement $placement, int $index) => $placement->update([
                'position' => $index + 1,
            ]));
    }
}
