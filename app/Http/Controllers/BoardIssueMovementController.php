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
            'column_id' => ['required', 'integer', 'exists:board_columns,id'],
        ]);

        $issue = Issue::query()->findOrFail($validated['issue_id']);
        $column = BoardColumn::query()->findOrFail($validated['column_id']);

        $moveIssueOnBoard->handle($request->user(), $board, $issue, $column);

        return to_route('clients.projects.boards.show', [
            'client' => $board->project->client,
            'project' => $board->project,
            'board' => $board,
        ]);
    }
}
