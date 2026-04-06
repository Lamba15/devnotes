<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\Issue;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BoardController extends Controller
{
    public function show(Request $request, Client $client, Project $project, Board $board): Response
    {
        abort_unless(
            $board->project_id === $project->id && $project->client_id === $client->id,
            404,
        );

        $user = $request->user();

        abort_unless($user->canAccessBoard($board), 403);

        $this->removeInvalidPlacements($board);

        $board->load([
            'columns' => fn ($query) => $query
                ->orderBy('position')
                ->with([
                    'placements' => fn ($placementQuery) => $placementQuery
                        ->orderBy('position')
                        ->with('issue'),
                ]),
        ]);

        $placedIssueIds = BoardIssuePlacement::query()
            ->where('board_id', $board->id)
            ->pluck('issue_id');

        return Inertia::render('boards/show', [
            'client' => $client->only(['id', 'name']),
            'project' => $project->only(['id', 'name']),
            'board' => $board->only(['id', 'name']),
            'backlog' => Issue::query()
                ->where('project_id', $project->id)
                ->whereNotIn('id', $placedIssueIds)
                ->orderBy('id')
                ->get()
                ->map(fn (Issue $issue) => $this->serializeIssue($issue))
                ->all(),
            'columns' => $board->columns->map(fn ($column) => [
                'id' => $column->id,
                'name' => $column->name,
                'position' => $column->position,
                'updates_status' => $column->updates_status,
                'mapped_status' => $column->mapped_status,
                'issues' => $column->placements
                    ->map(fn (BoardIssuePlacement $placement) => $this->serializeIssue($placement->issue))
                    ->values()
                    ->all(),
            ])->values()->all(),
            'can_move_issues' => $user->canMoveIssueOnBoard($board),
        ]);
    }

    private function removeInvalidPlacements(Board $board): void
    {
        BoardIssuePlacement::query()
            ->where('board_id', $board->id)
            ->with(['column', 'issue'])
            ->get()
            ->filter(fn (BoardIssuePlacement $placement) => $placement->column?->updates_status
                && filled($placement->column?->mapped_status)
                && $placement->issue?->status !== $placement->column?->mapped_status)
            ->each(fn (BoardIssuePlacement $placement) => $placement->delete());
    }

    private function serializeIssue(Issue $issue): array
    {
        return [
            'id' => $issue->id,
            'title' => $issue->title,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'type' => $issue->type,
        ];
    }
}
