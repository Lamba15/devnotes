<?php

namespace App\AI;

use App\Models\AssistantActionConfirmation;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\Client;
use App\Models\Issue;

class AssistantConfirmationPresenter
{
    public function present(AssistantActionConfirmation $confirmation): array
    {
        return match ($confirmation->tool_name) {
            'move_issue_on_board' => $this->presentSingleBoardMove($confirmation),
            'move_issues_on_board' => $this->presentBulkBoardMove($confirmation),
            'create_board' => $this->presentCreateBoard($confirmation),
            'update_board' => $this->presentUpdateBoard($confirmation),
            'delete_board' => $this->presentDeleteBoard($confirmation),
            'create_client' => $this->presentCreateClient($confirmation),
            'update_client' => $this->presentUpdateClient($confirmation),
            default => $this->presentGeneric($confirmation),
        };
    }

    private function presentSingleBoardMove(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $board = Board::query()->with('project.client')->find($payload['board_id'] ?? null);
        $column = BoardColumn::query()->find($payload['column_id'] ?? null);
        $issue = Issue::query()->find($payload['issue_id'] ?? null);

        return [
            'title' => 'Move issue',
            'summary' => filled($issue?->title) && filled($column?->name) && filled($board?->name)
                ? sprintf('Move "%s" to "%s" on "%s".', $issue->title, $column->name, $board->name)
                : 'Move an issue on a board.',
            'context' => $this->boardContext($board),
            'items' => $issue ? [[
                'label' => $issue->title,
                'description' => trim(collect([$issue->status, $issue->priority, $issue->type])->filter()->join(' / ')),
            ]] : [],
            'impact' => $column?->updates_status && filled($column?->mapped_status)
                ? sprintf('Issue status will change to %s.', $column->mapped_status)
                : null,
        ];
    }

    private function presentBulkBoardMove(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $board = Board::query()->with('project.client')->find($payload['board_id'] ?? null);
        $column = BoardColumn::query()->find($payload['column_id'] ?? null);
        $issues = Issue::query()
            ->whereIn('id', $payload['issue_ids'] ?? [])
            ->orderBy('title')
            ->get();

        $count = $issues->count();

        return [
            'title' => $count === 1 ? 'Move issue' : 'Move issues',
            'summary' => $count > 0 && filled($column?->name) && filled($board?->name)
                ? sprintf('Move %d issue%s to "%s" on "%s".', $count, $count === 1 ? '' : 's', $column->name, $board->name)
                : 'Move multiple issues on a board.',
            'context' => $this->boardContext($board),
            'items' => $issues->map(fn (Issue $issue) => [
                'label' => $issue->title,
                'description' => trim(collect([$issue->status, $issue->priority, $issue->type])->filter()->join(' / ')),
            ])->values()->all(),
            'impact' => $column?->updates_status && filled($column?->mapped_status)
                ? sprintf('Affected issue statuses will change to %s.', $column->mapped_status)
                : null,
        ];
    }

    private function presentCreateClient(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];

        return [
            'title' => 'Create client',
            'summary' => filled($payload['name'] ?? null)
                ? sprintf('Create client "%s".', $payload['name'])
                : 'Create a new client.',
            'context' => null,
            'items' => [],
            'impact' => null,
        ];
    }

    private function presentCreateBoard(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $client = Client::query()->find($payload['client_id'] ?? null);
        $project = \App\Models\Project::query()->find($payload['project_id'] ?? null);

        return [
            'title' => 'Create board',
            'summary' => filled($payload['name'] ?? null) && filled($project?->name)
                ? sprintf('Create board "%s" in project "%s".', $payload['name'], $project->name)
                : 'Create a new board.',
            'context' => [
                'project' => $project?->only(['id', 'name']),
                'client' => $client?->only(['id', 'name']),
            ],
            'items' => $this->presentBoardColumns($payload['columns'] ?? []),
            'impact' => null,
        ];
    }

    private function presentUpdateBoard(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $board = Board::query()->with('project.client')->find($payload['board_id'] ?? null);

        return [
            'title' => 'Update board',
            'summary' => $board
                ? sprintf('Update board "%s".', $board->name)
                : 'Update a board.',
            'context' => $this->boardContext($board),
            'items' => $this->presentBoardColumns($payload['columns'] ?? []),
            'impact' => null,
        ];
    }

    private function presentDeleteBoard(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $board = Board::query()->with('project.client')->find($payload['board_id'] ?? null);

        return [
            'title' => 'Delete board',
            'summary' => $board
                ? sprintf('Delete board "%s".', $board->name)
                : 'Delete a board.',
            'context' => $this->boardContext($board),
            'items' => [],
            'impact' => 'This permanently removes the board from the project.',
        ];
    }

    private function presentUpdateClient(AssistantActionConfirmation $confirmation): array
    {
        $payload = $confirmation->payload_json ?? [];
        $client = Client::query()->find($payload['client_id'] ?? null);

        return [
            'title' => 'Update client',
            'summary' => $client
                ? sprintf('Update client "%s".', $client->name)
                : 'Update a client.',
            'context' => $client ? ['client' => $client->only(['id', 'name'])] : null,
            'items' => [],
            'impact' => null,
        ];
    }

    private function presentGeneric(AssistantActionConfirmation $confirmation): array
    {
        return [
            'title' => str($confirmation->tool_name)->replace('_', ' ')->headline()->toString(),
            'summary' => 'Review and confirm this action before it executes.',
            'context' => null,
            'items' => [],
            'impact' => null,
        ];
    }

    private function boardContext(?Board $board): ?array
    {
        if (! $board) {
            return null;
        }

        return [
            'board' => $board->only(['id', 'name']),
            'project' => $board->project?->only(['id', 'name']),
            'client' => $board->project?->client?->only(['id', 'name']),
        ];
    }

    private function presentBoardColumns(array $columns): array
    {
        return collect($columns)
            ->filter(fn (mixed $column) => is_array($column) && filled($column['name'] ?? null))
            ->map(function (array $column): array {
                $description = ($column['updates_status'] ?? false) && filled($column['mapped_status'] ?? null)
                    ? sprintf('Status-updating column mapped to %s', $column['mapped_status'])
                    : 'Non-status-updating column';

                return [
                    'label' => $column['name'],
                    'description' => $description,
                ];
            })
            ->values()
            ->all();
    }
}
