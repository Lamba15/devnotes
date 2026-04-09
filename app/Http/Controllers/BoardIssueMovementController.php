<?php

namespace App\Http\Controllers;

use App\Actions\Tracking\MoveIssueOnBoard;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Issue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BoardIssueMovementController extends Controller
{
    public function store(Request $request, Board $board, MoveIssueOnBoard $moveIssueOnBoard): RedirectResponse
    {
        $validated = $request->validate([
            'issue_id' => ['required', 'integer', 'exists:issues,id'],
            'column_id' => ['nullable', 'integer', 'exists:board_columns,id'],
            'position' => ['nullable', 'integer', 'min:1'],
        ]);

        $issue = Issue::query()->findOrFail($validated['issue_id']);
        $column = array_key_exists('column_id', $validated) && $validated['column_id'] !== null
            ? BoardColumn::query()->findOrFail($validated['column_id'])
            : null;

        $moveIssueOnBoard->handle(
            $request->user(),
            $board,
            $issue,
            $column,
            $validated['position'] ?? null,
        );

        return to_route('clients.projects.boards.show', [
            'client' => $board->project->client,
            'project' => $board->project,
            'board' => $board,
        ]);
    }
}
