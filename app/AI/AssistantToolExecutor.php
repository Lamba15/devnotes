<?php

namespace App\AI;

use App\Actions\Boards\CreateBoard;
use App\Actions\Boards\DeleteBoard;
use App\Actions\Boards\UpdateBoard;
use App\Actions\Clients\CreateClient;
use App\Actions\Clients\UpdateClient;
use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\CreateTransaction;
use App\Actions\Finance\DeleteInvoice;
use App\Actions\Finance\UpdateInvoice;
use App\Actions\Projects\CreateProject;
use App\Actions\Projects\DeleteProject;
use App\Actions\Tracking\CreateIssue;
use App\Actions\Tracking\CreateIssueComment;
use App\Actions\Tracking\MoveIssueOnBoard;
use App\Actions\Tracking\UpdateIssue;
use App\Models\AssistantActionConfirmation;
use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceDiscount;
use App\Models\InvoiceItem;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssistantToolExecutor
{
    public function __construct(
        private readonly CreateBoard $createBoard,
        private readonly UpdateBoard $updateBoard,
        private readonly DeleteBoard $deleteBoard,
        private readonly CreateClient $createClient,
        private readonly UpdateClient $updateClient,
        private readonly CreateProject $createProject,
        private readonly CreateIssue $createIssue,
        private readonly UpdateIssue $updateIssue,
        private readonly CreateIssueComment $createIssueComment,
        private readonly MoveIssueOnBoard $moveIssueOnBoard,
        private readonly CreateTransaction $createTransaction,
        private readonly CreateInvoice $createInvoice,
    ) {}

    public function execute(User $user, string $toolName, array $payload, ?AssistantActionConfirmation $confirmation = null): array
    {
        return match ($toolName) {
            'create_client' => $this->executeCreateClient($user, $payload, $confirmation),
            'update_client' => $this->executeUpdateClient($user, $payload, $confirmation),
            'list_accessible_clients' => $this->executeListAccessibleClients($user, $payload),
            'create_project' => $this->executeCreateProject($user, $payload, $confirmation),
            'list_accessible_projects' => $this->executeListAccessibleProjects($user, $payload),
            'create_issue' => $this->executeCreateIssue($user, $payload, $confirmation),
            'update_issue' => $this->executeUpdateIssue($user, $payload, $confirmation),
            'list_accessible_issues' => $this->executeListAccessibleIssues($user, $payload),
            'get_issue_discussion' => $this->executeGetIssueDiscussion($user, $payload),
            'get_issue_detail' => $this->executeGetIssueDetail($user, $payload),
            'get_board_context' => $this->executeGetBoardContext($user, $payload),
            'list_accessible_boards' => $this->executeListAccessibleBoards($user, $payload),
            'create_board' => $this->executeCreateBoard($user, $payload, $confirmation),
            'update_board' => $this->executeUpdateBoard($user, $payload, $confirmation),
            'delete_board' => $this->executeDeleteBoard($user, $payload, $confirmation),
            'move_issue_on_board' => $this->executeMoveIssueOnBoard($user, $payload, $confirmation),
            'move_issues_on_board' => $this->executeMoveIssuesOnBoard($user, $payload, $confirmation),
            'add_issue_comment' => $this->executeAddIssueComment($user, $payload, $confirmation),
            'reply_to_issue_comment' => $this->executeReplyToIssueComment($user, $payload, $confirmation),
            'create_transaction' => $this->executeCreateTransaction($user, $payload, $confirmation),
            'list_accessible_transactions' => $this->executeListAccessibleTransactions($user, $payload),
            'create_invoice' => $this->executeCreateInvoice($user, $payload, $confirmation),
            'list_accessible_invoices' => $this->executeListAccessibleInvoices($user, $payload),
            'list_audit_logs' => $this->executeListAuditLogs($user, $payload),
            'get_platform_stats' => $this->executeGetPlatformStats($user),
            'manage_user_credits' => $this->executeManageUserCredits($user, $payload, $confirmation),
            'delete_issue' => $this->executeDeleteIssue($user, $payload, $confirmation),
            'update_project' => $this->executeUpdateProject($user, $payload, $confirmation),
            'update_transaction' => $this->executeUpdateTransaction($user, $payload, $confirmation),
            'update_invoice' => $this->executeUpdateInvoice($user, $payload, $confirmation),
            'delete_project' => $this->executeDeleteProject($user, $payload, $confirmation),
            'list_client_members' => $this->executeListClientMembers($user, $payload),
            'delete_client' => $this->executeDeleteClient($user, $payload, $confirmation),
            'delete_transaction' => $this->executeDeleteTransaction($user, $payload, $confirmation),
            'delete_invoice' => $this->executeDeleteInvoice($user, $payload, $confirmation),
            'get_client_detail' => $this->executeGetClientDetail($user, $payload),
            'get_project_detail' => $this->executeGetProjectDetail($user, $payload),
            default => throw ValidationException::withMessages([
                'tool' => "Unsupported assistant tool [{$toolName}].",
            ]),
        };
    }

    private function executeCreateClient(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $client = $this->createClient->handle($user, $payload, 'ai_assistant');

        return [
            'type' => 'client',
            'id' => $client->id,
            'name' => $client->name,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeUpdateClient(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $client = Client::query()->findOrFail($payload['client_id']);
        $updatedClient = $this->updateClient->handle($user, $client, $payload, 'ai_assistant');

        return [
            'type' => 'client',
            'id' => $updatedClient->id,
            'name' => $updatedClient->name,
            'email' => $updatedClient->email,
            'behavior' => $updatedClient->behavior?->only(['id', 'name', 'slug']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListAccessibleClients(User $user, array $payload): array
    {
        $limit = (int) ($payload['limit'] ?? 10);
        $limit = max(1, min($limit, 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'name', 'created_at', 'updated_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);
        $fuzzySearch = $this->fuzzyLikePattern($search);

        $clients = Client::query()
            ->with('behavior:id,name,slug')
            ->when(
                ! $user->isPlatformOwner(),
                function ($query) use ($user): void {
                    $clientIds = $user->clientMemberships()->pluck('client_id');

                    $query->whereIn('id', $clientIds);
                }
            )
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($clientQuery) use ($search): void {
                    $pattern = $this->fuzzyLikePattern($search);

                    $clientQuery->where('name', 'like', $pattern)
                        ->orWhere('email', 'like', $pattern);
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->limit($limit)
            ->get();

        return [
            'type' => 'client_list',
            'items' => $clients
                ->map(fn (Client $client) => [
                    'id' => $client->id,
                    'name' => $client->name,
                    'behavior' => $client->behavior?->only(['id', 'name', 'slug']),
                    'email' => $client->email,
                ])
                ->values()
                ->all(),
        ];
    }

    private function executeCreateProject(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $client = Client::query()->findOrFail($payload['client_id']);
        $project = $this->createProject->handle($user, $client, $payload, 'ai_assistant');

        return [
            'type' => 'project',
            'id' => $project->id,
            'name' => $project->name,
            'client' => $project->client?->only(['id', 'name']),
            'status' => $project->status?->only(['id', 'name', 'slug']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListAccessibleProjects(User $user, array $payload): array
    {
        $limit = (int) ($payload['limit'] ?? 10);
        $limit = max(1, min($limit, 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'name', 'created_at', 'updated_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $projects = Project::query()
            ->with(['client:id,name', 'status:id,name,slug'])
            ->when(
                ! $user->isPlatformOwner(),
                function ($query) use ($user): void {
                    $manageableClientIds = $user->clientMemberships()
                        ->whereIn('role', ['owner', 'admin'])
                        ->pluck('client_id');

                    $query->where(function ($projectQuery) use ($manageableClientIds, $user): void {
                        if ($manageableClientIds->isNotEmpty()) {
                            $projectQuery->whereIn('client_id', $manageableClientIds);
                            $projectQuery->orWhereHas('memberships', fn ($membershipQuery) => $membershipQuery->where('user_id', $user->id));

                            return;
                        }

                        $projectQuery->whereHas('memberships', fn ($membershipQuery) => $membershipQuery->where('user_id', $user->id));
                    });
                }
            )
            ->when(isset($payload['client_id']), fn ($query) => $query->where('client_id', $payload['client_id']))
            ->when(isset($payload['status_id']), fn ($query) => $query->where('status_id', $payload['status_id']))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($projectQuery) use ($search): void {
                    $pattern = $this->fuzzyLikePattern($search);

                    $projectQuery->where('name', 'like', $pattern)
                        ->orWhere('description', 'like', $pattern)
                        ->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', $pattern));
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->limit($limit)
            ->get();

        return [
            'type' => 'project_list',
            'items' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'name' => $project->name,
                'description' => $project->description,
                'client' => $project->client?->only(['id', 'name']),
                'status' => $project->status?->only(['id', 'name', 'slug']),
            ])->values()->all(),
        ];
    }

    private function executeCreateTransaction(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $project = Project::query()->with('client')->findOrFail($payload['project_id']);
        $transaction = $this->createTransaction->handle($user, $project, $payload, 'ai_assistant');

        return [
            'type' => 'transaction',
            'id' => $transaction->id,
            'description' => $transaction->description,
            'amount' => $transaction->amount,
            'project' => $transaction->project?->only(['id', 'name']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListAccessibleTransactions(User $user, array $payload): array
    {
        $limit = (int) ($payload['limit'] ?? 10);
        $limit = max(1, min($limit, 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'description', 'amount', 'occurred_date', 'created_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $transactions = Transaction::query()
            ->with('project.client')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $user->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                )
            )
            ->when(isset($payload['client_id']), function ($query) use ($payload): void {
                $query->whereHas('project', fn ($projectQuery) => $projectQuery->where('client_id', $payload['client_id']));
            })
            ->when(isset($payload['project_id']), fn ($query) => $query->where('project_id', $payload['project_id']))
            ->when($search !== '', fn ($query) => $query->where('description', 'like', $this->fuzzyLikePattern($search)))
            ->orderBy($sortBy, $sortDirection)
            ->limit($limit)
            ->get();

        return [
            'type' => 'transaction_list',
            'items' => $transactions->map(fn (Transaction $transaction) => [
                'id' => $transaction->id,
                'description' => $transaction->description,
                'amount' => $transaction->amount,
                'occurred_date' => $transaction->occurred_date?->toDateString(),
                'project' => [
                    'id' => $transaction->project?->id,
                    'name' => $transaction->project?->name,
                    'client' => $transaction->project?->client?->only(['id', 'name']),
                ],
            ])->values()->all(),
        ];
    }

    private function executeCreateIssue(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $project = Project::query()->findOrFail($payload['project_id']);
        $issue = $this->createIssue->handle($user, $project, $payload, 'ai_assistant');

        return [
            'type' => 'issue',
            'id' => $issue->id,
            'title' => $issue->title,
            'status' => $issue->status,
            'priority' => $issue->priority,
            'project' => $project->only(['id', 'name']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeUpdateIssue(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $issue = Issue::query()->with('project')->findOrFail($payload['issue_id']);
        $updatedIssue = $this->updateIssue->handle($user, $issue, $payload, 'ai_assistant');

        return [
            'type' => 'issue',
            'id' => $updatedIssue->id,
            'title' => $updatedIssue->title,
            'status' => $updatedIssue->status,
            'priority' => $updatedIssue->priority,
            'project' => $updatedIssue->project?->only(['id', 'name']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListAccessibleIssues(User $user, array $payload): array
    {
        $limit = (int) ($payload['limit'] ?? 10);
        $limit = max(1, min($limit, 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'title', 'status', 'priority', 'type', 'created_at', 'updated_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $issues = $this->accessibleIssuesQuery($user)
            ->with('project.client')
            ->when(isset($payload['project_id']), fn ($query) => $query->where('project_id', $payload['project_id']))
            ->when(isset($payload['status']), fn ($query) => $query->where('status', $payload['status']))
            ->when(isset($payload['priority']), fn ($query) => $query->where('priority', $payload['priority']))
            ->when(isset($payload['type']), fn ($query) => $query->where('type', $payload['type']))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($issueQuery) use ($search): void {
                    $pattern = $this->fuzzyLikePattern($search);

                    $issueQuery->where('title', 'like', $pattern)
                        ->orWhere('description', 'like', $pattern);
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->limit($limit)
            ->get();

        return [
            'type' => 'issue_list',
            'items' => $issues->map(fn (Issue $issue) => [
                'id' => $issue->id,
                'title' => $issue->title,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'project' => [
                    'id' => $issue->project?->id,
                    'name' => $issue->project?->name,
                    'client' => $issue->project?->client?->only(['id', 'name']),
                ],
            ])->values()->all(),
        ];
    }

    private function executeGetIssueDiscussion(User $user, array $payload): array
    {
        $issue = $this->accessibleIssuesQuery($user)
            ->with(['project.client', 'comments.user:id,name'])
            ->whereKey($payload['issue_id'])
            ->first();

        if ($issue === null) {
            throw ValidationException::withMessages([
                'issue_id' => 'The selected issue is not available in the current user scope.',
            ]);
        }

        $comments = $issue->comments
            ->sortBy('id')
            ->values();

        return [
            'type' => 'issue_discussion',
            'issue' => [
                'id' => $issue->id,
                'title' => $issue->title,
                'project' => [
                    'id' => $issue->project?->id,
                    'name' => $issue->project?->name,
                    'client' => $issue->project?->client?->only(['id', 'name']),
                ],
            ],
            'comments' => $this->buildCommentTree($comments, null),
        ];
    }

    private function executeGetIssueDetail(User $user, array $payload): array
    {
        $issue = $this->accessibleIssuesQuery($user)
            ->with(['project.client', 'assignees:id,name', 'comments.user:id,name'])
            ->whereKey($payload['issue_id'])
            ->first();

        if ($issue === null) {
            throw ValidationException::withMessages([
                'issue_id' => 'The selected issue is not available in the current user scope.',
            ]);
        }

        $comments = $issue->comments
            ->sortBy('id')
            ->values();

        return [
            'type' => 'issue_detail',
            'issue' => [
                'id' => $issue->id,
                'title' => $issue->title,
                'description' => $issue->description,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'assignees' => $issue->assignees->map(fn ($user) => $user->only(['id', 'name']))->values()->all(),
                'project' => [
                    'id' => $issue->project?->id,
                    'name' => $issue->project?->name,
                    'client' => $issue->project?->client?->only(['id', 'name']),
                ],
            ],
            'comments' => $this->buildCommentTree($comments, null),
        ];
    }

    private function executeGetBoardContext(User $user, array $payload): array
    {
        $board = Board::query()->with('project.client')->findOrFail($payload['board_id']);

        if (! $user->canAccessBoard($board)) {
            throw ValidationException::withMessages([
                'board_id' => 'The selected board is not available in the current user scope.',
            ]);
        }

        $this->removeInvalidBoardPlacements($board);

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

        $backlog = Issue::query()
            ->where('project_id', $board->project_id)
            ->whereNotIn('id', $placedIssueIds)
            ->orderBy('id')
            ->get();

        return [
            'type' => 'board_context',
            'board' => [
                'id' => $board->id,
                'name' => $board->name,
                'project' => [
                    'id' => $board->project?->id,
                    'name' => $board->project?->name,
                    'client' => $board->project?->client?->only(['id', 'name']),
                ],
            ],
            'backlog' => $backlog->map(fn (Issue $issue) => $this->serializeIssue($issue))->values()->all(),
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
        ];
    }

    private function executeListAccessibleBoards(User $user, array $payload): array
    {
        $limit = max(1, min((int) ($payload['limit'] ?? 10), 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'name', 'created_at', 'updated_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $boards = Board::query()
            ->with('project.client')
            ->get()
            ->filter(fn (Board $board) => $user->canAccessBoard($board))
            ->filter(function (Board $board) use ($search, $payload): bool {
                if (isset($payload['client_id']) && $board->project?->client_id !== (int) $payload['client_id']) {
                    return false;
                }

                if (isset($payload['project_id']) && $board->project_id !== (int) $payload['project_id']) {
                    return false;
                }

                if ($search === '') {
                    return true;
                }

                $haystack = strtolower(implode(' ', array_filter([
                    $board->name,
                    $board->project?->name,
                    $board->project?->client?->name,
                ])));

                return $this->matchesFuzzyString($haystack, strtolower($search));
            })
            ->sortBy($sortBy, SORT_NATURAL | SORT_FLAG_CASE, $sortDirection === 'desc')
            ->take($limit)
            ->values();

        return [
            'type' => 'board_list',
            'items' => $boards->map(fn (Board $board) => [
                'id' => $board->id,
                'name' => $board->name,
                'project' => [
                    'id' => $board->project?->id,
                    'name' => $board->project?->name,
                    'client' => $board->project?->client?->only(['id', 'name']),
                ],
            ])->all(),
        ];
    }

    private function executeCreateBoard(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $client = Client::query()->findOrFail($payload['client_id']);
        $payload['columns'] = $this->normalizeBoardColumns($payload['columns'] ?? null);
        $this->validateBoardColumns($payload['columns'] ?? null, false);

        $board = $this->createBoard->handle($user, $client, $payload, 'ai_assistant');
        $board->load(['project.client', 'columns' => fn ($query) => $query->orderBy('position')]);

        return $this->serializeBoardResult($board, $confirmation);
    }

    private function executeUpdateBoard(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $board = Board::query()->with('project.client')->findOrFail($payload['board_id']);
        $payload['columns'] = $this->normalizeBoardColumns($payload['columns'] ?? null);
        $this->validateBoardColumns($payload['columns'] ?? null, true);

        $board = $this->updateBoard->handle($user, $board, $payload, 'ai_assistant');
        $board->load(['project.client', 'columns' => fn ($query) => $query->orderBy('position')]);

        return $this->serializeBoardResult($board, $confirmation);
    }

    private function executeDeleteBoard(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $board = Board::query()->with('project.client')->findOrFail($payload['board_id']);

        $boardName = $board->name;
        $boardId = $board->id;
        $project = $board->project?->only(['id', 'name']);
        $client = $board->project?->client?->only(['id', 'name']);

        $this->deleteBoard->handle($user, $board, 'ai_assistant');

        return [
            'type' => 'board_deleted',
            'id' => $boardId,
            'name' => $boardName,
            'project' => $project,
            'client' => $client,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeMoveIssueOnBoard(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $board = Board::query()->findOrFail($payload['board_id']);
        $issue = Issue::query()->findOrFail($payload['issue_id']);
        $column = BoardColumn::query()->findOrFail($payload['column_id']);

        $placement = $this->moveIssueOnBoard->handle(
            $user,
            $board,
            $issue,
            $column,
            $payload['position'] ?? null,
            'ai_assistant',
        );

        return [
            'type' => 'board_issue_move',
            'id' => $placement->id,
            'board' => $placement->board?->only(['id', 'name']),
            'column' => $placement->column?->only(['id', 'name']),
            'issue' => [
                'id' => $placement->issue?->id,
                'title' => $placement->issue?->title,
                'status' => $placement->issue?->status,
                'priority' => $placement->issue?->priority,
                'type' => $placement->issue?->type,
            ],
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeMoveIssuesOnBoard(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $board = Board::query()->findOrFail($payload['board_id']);
        $column = BoardColumn::query()->findOrFail($payload['column_id']);
        $issueIds = collect($payload['issue_ids'] ?? [])->map(fn ($id) => (int) $id)->filter()->values();

        $placements = $issueIds->map(function (int $issueId) use ($user, $board, $column) {
            $issue = Issue::query()->findOrFail($issueId);

            return $this->moveIssueOnBoard->handle(
                $user,
                $board,
                $issue,
                $column,
                null,
                'ai_assistant',
            );
        })->filter()->values();

        return [
            'type' => 'board_issue_bulk_move',
            'board' => $board->only(['id', 'name']),
            'column' => $column->only(['id', 'name']),
            'issues' => $placements->map(fn ($placement) => [
                'id' => $placement->issue?->id,
                'title' => $placement->issue?->title,
                'status' => $placement->issue?->status,
                'priority' => $placement->issue?->priority,
                'type' => $placement->issue?->type,
            ])->all(),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeAddIssueComment(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $issue = Issue::query()->findOrFail($payload['issue_id']);
        $comment = $this->createIssueComment->handle($user, $issue, [
            'body' => $payload['body'],
        ], 'ai_assistant');

        return $this->serializeIssueCommentResult($comment, $issue, $confirmation);
    }

    private function executeReplyToIssueComment(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $issue = Issue::query()->findOrFail($payload['issue_id']);
        $comment = $this->createIssueComment->handle($user, $issue, [
            'parent_id' => $payload['parent_id'],
            'body' => $payload['body'],
        ], 'ai_assistant');

        return $this->serializeIssueCommentResult($comment, $issue, $confirmation);
    }

    private function executeCreateInvoice(
        User $user,
        array $payload,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        $project = Project::query()->with('client')->findOrFail($payload['project_id']);
        $invoice = $this->createInvoice->handle($user, $project, $payload, 'ai_assistant');

        return [
            'type' => 'invoice',
            'id' => $invoice->id,
            'reference' => $invoice->reference,
            'status' => $invoice->status,
            'amount' => $invoice->amount,
            'project' => $invoice->project?->only(['id', 'name']),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListAccessibleInvoices(User $user, array $payload): array
    {
        $limit = (int) ($payload['limit'] ?? 10);
        $limit = max(1, min($limit, 50));
        $search = trim((string) ($payload['search'] ?? ''));
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'reference', 'status', 'amount', 'issued_at', 'due_at', 'created_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $invoices = Invoice::query()
            ->with('project.client')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $user->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                )
            )
            ->when(isset($payload['client_id']), function ($query) use ($payload): void {
                $query->whereHas('project', fn ($projectQuery) => $projectQuery->where('client_id', $payload['client_id']));
            })
            ->when(isset($payload['project_id']), fn ($query) => $query->where('project_id', $payload['project_id']))
            ->when(isset($payload['status']), fn ($query) => $query->where('status', $payload['status']))
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($invoiceQuery) use ($search): void {
                    $pattern = $this->fuzzyLikePattern($search);

                    $invoiceQuery->where('reference', 'like', $pattern)
                        ->orWhere('notes', 'like', $pattern);
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->limit($limit)
            ->get();

        return [
            'type' => 'invoice_list',
            'items' => $invoices->map(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'amount' => $invoice->amount,
                'issued_at' => $invoice->issued_at?->toDateString(),
                'project' => [
                    'id' => $invoice->project?->id,
                    'name' => $invoice->project?->name,
                    'client' => $invoice->project?->client?->only(['id', 'name']),
                ],
            ])->values()->all(),
        ];
    }

    private function serializeIssueCommentResult(
        IssueComment $comment,
        Issue $issue,
        ?AssistantActionConfirmation $confirmation,
    ): array {
        return [
            'type' => 'issue_comment',
            'id' => $comment->id,
            'body' => $comment->body,
            'parent_id' => $comment->parent_id,
            'issue' => [
                'id' => $issue->id,
                'title' => $issue->title,
            ],
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function accessibleIssuesQuery(User $user): Builder
    {
        return Issue::query()->when(
            ! $user->isPlatformOwner(),
            function ($query) use ($user): void {
                $manageableClientIds = $user->clientMemberships()
                    ->whereIn('role', ['owner', 'admin'])
                    ->pluck('client_id');

                $query->where(function ($issueQuery) use ($manageableClientIds, $user): void {
                    if ($manageableClientIds->isNotEmpty()) {
                        $issueQuery->whereHas('project', fn ($projectQuery) => $projectQuery->whereIn('client_id', $manageableClientIds));
                        $issueQuery->orWhereHas('project.memberships', fn ($membershipQuery) => $membershipQuery->where('user_id', $user->id));

                        return;
                    }

                    $issueQuery->whereHas('project.memberships', fn ($membershipQuery) => $membershipQuery->where('user_id', $user->id));
                });
            }
        );
    }

    private function removeInvalidBoardPlacements(Board $board): void
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

    private function serializeBoardResult(Board $board, ?AssistantActionConfirmation $confirmation): array
    {
        return [
            'type' => 'board',
            'id' => $board->id,
            'name' => $board->name,
            'project' => [
                'id' => $board->project?->id,
                'name' => $board->project?->name,
                'client' => $board->project?->client?->only(['id', 'name']),
            ],
            'columns' => $board->columns
                ->sortBy('position')
                ->values()
                ->map(fn (BoardColumn $column) => [
                    'id' => $column->id,
                    'name' => $column->name,
                    'position' => $column->position,
                    'updates_status' => $column->updates_status,
                    'mapped_status' => $column->mapped_status,
                ])
                ->all(),
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function buildCommentTree($comments, ?int $parentId): array
    {
        return $comments
            ->where('parent_id', $parentId)
            ->map(fn (IssueComment $comment) => [
                'id' => $comment->id,
                'body' => $comment->body,
                'parent_id' => $comment->parent_id,
                'user' => $comment->user?->only(['id', 'name']),
                'created_at' => $comment->created_at?->toISOString(),
                'replies' => $this->buildCommentTree($comments, $comment->id),
            ])
            ->values()
            ->all();
    }

    private function normalizeSortBy(?string $sortBy, array $allowed, string $default): string
    {
        return in_array($sortBy, $allowed, true) ? $sortBy : $default;
    }

    private function normalizeSortDirection(?string $sortDirection): string
    {
        return $sortDirection === 'asc' ? 'asc' : 'desc';
    }

    private function fuzzyLikePattern(string $search): string
    {
        $search = preg_replace('/\s+/', '', trim($search)) ?? '';

        if ($search === '') {
            return '%%';
        }

        return '%'.implode('%', preg_split('//u', mb_strtolower($search), -1, PREG_SPLIT_NO_EMPTY)).'%';
    }

    private function matchesFuzzyString(string $haystack, string $search): bool
    {
        $search = preg_replace('/\s+/', '', $search) ?? '';

        if ($search === '') {
            return true;
        }

        $position = 0;

        foreach (preg_split('//u', $search, -1, PREG_SPLIT_NO_EMPTY) as $character) {
            $foundAt = strpos($haystack, $character, $position);

            if ($foundAt === false) {
                return false;
            }

            $position = $foundAt + 1;
        }

        return true;
    }

    private function validateBoardColumns(mixed $columns, bool $allowExistingColumnIds): void
    {
        if ($columns === null) {
            return;
        }

        if (! is_array($columns)) {
            throw ValidationException::withMessages([
                'columns' => 'Board columns must be provided as an array.',
            ]);
        }

        foreach (array_values($columns) as $index => $column) {
            $path = 'columns.'.($index + 1);

            if (! is_array($column)) {
                throw ValidationException::withMessages([
                    $path => 'Each board column must be an object.',
                ]);
            }

            if ($allowExistingColumnIds && array_key_exists('id', $column) && ! is_null($column['id']) && ! is_int($column['id'])) {
                throw ValidationException::withMessages([
                    $path.'.id' => 'Column ids must be integers.',
                ]);
            }

            if (! array_key_exists('name', $column) || ! is_string($column['name']) || trim($column['name']) === '') {
                throw ValidationException::withMessages([
                    $path.'.name' => 'Each board column must have a name.',
                ]);
            }

            if (mb_strlen($column['name']) > 255) {
                throw ValidationException::withMessages([
                    $path.'.name' => 'Board column names may not be greater than 255 characters.',
                ]);
            }

            if (array_key_exists('updates_status', $column) && ! is_bool($column['updates_status']) && ! is_null($column['updates_status'])) {
                throw ValidationException::withMessages([
                    $path.'.updates_status' => 'The updates_status field must be true or false.',
                ]);
            }

            if (array_key_exists('mapped_status', $column)
                && ! is_null($column['mapped_status'])
                && ! in_array($column['mapped_status'], ['todo', 'in_progress', 'done'], true)) {
                throw ValidationException::withMessages([
                    $path.'.mapped_status' => 'The mapped status must be one of todo, in_progress, or done.',
                ]);
            }

            if (($column['updates_status'] ?? false) && ! filled($column['mapped_status'] ?? null)) {
                throw ValidationException::withMessages([
                    $path.'.mapped_status' => 'Status-updating columns must choose a mapped status.',
                ]);
            }
        }
    }

    private function normalizeBoardColumns(mixed $columns): mixed
    {
        if (! is_array($columns)) {
            return $columns;
        }

        return array_map(function (mixed $column): mixed {
            if (! is_array($column)) {
                return $column;
            }

            if (array_key_exists('mapped_status', $column) && is_string($column['mapped_status'])) {
                $column['mapped_status'] = $this->normalizeBoardMappedStatus($column['mapped_status']);
            }

            return $column;
        }, $columns);
    }

    private function normalizeBoardMappedStatus(string $mappedStatus): string
    {
        $normalized = Str::of($mappedStatus)
            ->trim()
            ->lower()
            ->squish()
            ->replace('-', '_')
            ->replace(' ', '_')
            ->toString();

        return match ($normalized) {
            'to_do' => 'todo',
            'inprogress', 'in_progress', 'progress', 'doing', 'working', 'started' => 'in_progress',
            'complete', 'completed', 'finished' => 'done',
            default => $normalized,
        };
    }

    private function executeListAuditLogs(User $user, array $payload): array
    {
        abort_unless($user->isPlatformOwner(), 403);

        $query = AuditLog::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at');

        if ($search = ($payload['search'] ?? null)) {
            $query->where(function ($q) use ($search) {
                $q->where('event', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('subject_type', 'like', "%{$search}%");
            });
        }

        if ($event = ($payload['event'] ?? null)) {
            $query->where('event', $event);
        }

        if ($source = ($payload['source'] ?? null)) {
            $query->where('source', $source);
        }

        $limit = min(max((int) ($payload['limit'] ?? 20), 1), 50);

        return [
            'type' => 'audit_logs',
            'logs' => $query->limit($limit)->get()->map(fn ($log) => [
                'id' => $log->id,
                'event' => $log->event,
                'source' => $log->source,
                'subject_type' => class_basename($log->subject_type ?? ''),
                'subject_id' => $log->subject_id,
                'user' => $log->user?->name ?? 'System',
                'created_at' => $log->created_at->toISOString(),
            ])->all(),
        ];
    }

    private function executeGetPlatformStats(User $user): array
    {
        abort_unless($user->isPlatformOwner(), 403);

        $issuesByStatus = Issue::query()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $issuesByPriority = Issue::query()
            ->selectRaw('priority, COUNT(*) as count')
            ->whereNotNull('priority')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->all();

        $invoicesByStatus = Invoice::query()
            ->selectRaw('status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status => [
                'count' => (int) $row->count,
                'amount' => round((float) $row->total, 2),
            ]])
            ->all();

        return [
            'type' => 'platform_stats',
            'clients' => Client::count(),
            'projects' => Project::count(),
            'issues' => Issue::count(),
            'open_issues' => Issue::where('status', 'todo')->orWhere('status', 'in_progress')->count(),
            'overdue_issues' => Issue::whereNotNull('due_date')
                ->where('due_date', '<', now()->toDateString())
                ->where('status', '!=', 'done')
                ->count(),
            'unassigned_issues' => Issue::doesntHave('assignees')
                ->where('status', '!=', 'done')
                ->count(),
            'transactions' => Transaction::count(),
            'invoices' => Invoice::count(),
            'users' => User::count(),
            'boards' => Board::count(),
            'issues_by_status' => $issuesByStatus,
            'issues_by_priority' => $issuesByPriority,
            'invoice_totals_by_status' => $invoicesByStatus,
            'total_invoiced' => round((float) Invoice::sum('amount'), 2),
            'total_transacted' => round((float) Transaction::sum('amount'), 2),
        ];
    }

    private function executeManageUserCredits(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        abort_unless($user->isPlatformOwner(), 403);

        $targetUser = User::findOrFail($payload['user_id']);
        $credits = (int) $payload['ai_credits'];

        $targetUser->update(['ai_credits' => $credits]);

        return [
            'type' => 'user_credits_updated',
            'user_id' => $targetUser->id,
            'user_name' => $targetUser->name,
            'ai_credits' => $credits,
            'ai_credits_used' => $targetUser->ai_credits_used,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeDeleteIssue(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $issue = Issue::findOrFail($payload['issue_id']);
        $project = $issue->project;

        abort_unless($user->canManageProject($project), 403);

        $issueTitle = $issue->title;
        $issueId = $issue->id;
        $issue->delete();

        return [
            'type' => 'issue_deleted',
            'id' => $issueId,
            'title' => $issueTitle,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeUpdateProject(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $project = Project::findOrFail($payload['project_id']);

        abort_unless($user->canManageProject($project), 403);

        $updateData = [];
        if (isset($payload['name'])) {
            $updateData['name'] = $payload['name'];
        }
        if (array_key_exists('description', $payload)) {
            $updateData['description'] = $payload['description'];
        }
        if (isset($payload['status_id'])) {
            $updateData['status_id'] = $payload['status_id'];
        }

        $project->update($updateData);
        $project->refresh()->load('status');

        return [
            'type' => 'project',
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'status' => $project->status?->name,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeUpdateTransaction(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $transaction = Transaction::findOrFail($payload['transaction_id']);

        abort_unless($user->canManageProjectFinance($transaction->project), 403);

        $updateData = [];
        if (isset($payload['description'])) {
            $updateData['description'] = $payload['description'];
        }
        if (isset($payload['amount'])) {
            $updateData['amount'] = $payload['amount'];
        }
        if (array_key_exists('category', $payload)) {
            $updateData['category'] = $payload['category'];
        }

        $transaction->update($updateData);

        return [
            'type' => 'transaction',
            'id' => $transaction->id,
            'description' => $transaction->description,
            'amount' => (string) $transaction->amount,
            'category' => $transaction->category,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeUpdateInvoice(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $invoice = Invoice::findOrFail($payload['invoice_id']);

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        $invoice = app(UpdateInvoice::class)->handle($user, $invoice, $invoice->project, [
            'reference' => $payload['reference'] ?? $invoice->reference,
            'status' => $payload['status'] ?? $invoice->status,
            'currency' => $payload['currency'] ?? $invoice->currency ?? 'USD',
            'issued_at' => array_key_exists('issued_at', $payload) ? $payload['issued_at'] : $invoice->issued_at?->toDateString(),
            'due_at' => array_key_exists('due_at', $payload) ? $payload['due_at'] : $invoice->due_at?->toDateString(),
            'paid_at' => array_key_exists('paid_at', $payload) ? $payload['paid_at'] : $invoice->paid_at?->toDateString(),
            'notes' => array_key_exists('notes', $payload) ? $payload['notes'] : $invoice->notes,
            'items' => $payload['items'] ?? $invoice->items->map(fn (InvoiceItem $item) => [
                'description' => $item->description,
                'hours' => $item->hours,
                'rate' => $item->rate,
                'amount' => $item->hours !== null && $item->rate !== null ? null : $item->base_amount,
            ])->values()->all(),
            'discounts' => $payload['discounts'] ?? $invoice->discounts->map(function (InvoiceDiscount $discount) use ($invoice) {
                $itemIndex = $discount->invoice_item_id
                    ? $invoice->items->search(fn (InvoiceItem $item) => $item->id === $discount->invoice_item_id)
                    : null;

                return [
                    'label' => $discount->label,
                    'type' => $discount->type,
                    'value' => $discount->value,
                    'target_type' => $discount->invoice_item_id ? 'item' : 'invoice',
                    'target_item_index' => $itemIndex !== false ? $itemIndex : null,
                ];
            })->values()->all(),
            'amount' => $payload['amount'] ?? (string) $invoice->amount,
        ], 'ai_assistant');

        return [
            'type' => 'invoice',
            'id' => $invoice->id,
            'reference' => $invoice->reference,
            'status' => $invoice->status,
            'amount' => (string) $invoice->amount,
            'currency' => $invoice->currency,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeDeleteProject(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $project = Project::findOrFail($payload['project_id']);

        abort_unless($user->canManageProject($project), 403);

        $name = $project->name;
        $id = $project->id;

        app(DeleteProject::class)->handle($user, $project);

        return [
            'type' => 'project_deleted',
            'id' => $id,
            'name' => $name,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeListClientMembers(User $user, array $payload): array
    {
        $client = Client::findOrFail($payload['client_id']);

        abort_unless($user->canAccessClient($client), 403);

        $members = $client->memberships()
            ->with('user:id,name,email,avatar_path')
            ->get()
            ->map(fn ($membership) => [
                'id' => $membership->id,
                'role' => $membership->role,
                'user_id' => $membership->user->id,
                'user_name' => $membership->user->name,
                'user_email' => $membership->user->email,
            ])
            ->all();

        return [
            'type' => 'client_members',
            'client_id' => $client->id,
            'client_name' => $client->name,
            'members' => $members,
            'count' => count($members),
        ];
    }

    private function executeDeleteClient(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        abort_unless($user->isPlatformOwner(), 403);

        $client = Client::findOrFail($payload['client_id']);
        $clientName = $client->name;
        $clientId = $client->id;
        $client->delete();

        return [
            'type' => 'client_deleted',
            'id' => $clientId,
            'name' => $clientName,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeDeleteTransaction(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $transaction = Transaction::findOrFail($payload['transaction_id']);

        abort_unless($user->canAccessProjectFinance($transaction->project), 403);

        $transactionId = $transaction->id;
        $description = $transaction->description;
        $transaction->delete();

        return [
            'type' => 'transaction_deleted',
            'id' => $transactionId,
            'description' => $description,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeDeleteInvoice(User $user, array $payload, ?AssistantActionConfirmation $confirmation): array
    {
        $invoice = Invoice::findOrFail($payload['invoice_id']);

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        $invoiceId = $invoice->id;
        $reference = $invoice->reference;
        app(DeleteInvoice::class)->handle($user, $invoice, 'ai_assistant');

        return [
            'type' => 'invoice_deleted',
            'id' => $invoiceId,
            'reference' => $reference,
            'confirmation_id' => $confirmation?->id,
        ];
    }

    private function executeGetClientDetail(User $user, array $payload): array
    {
        $client = Client::findOrFail($payload['client_id']);

        abort_unless($user->canAccessClient($client), 403);

        $client->load('behavior:id,name,slug');

        $projectCount = $client->projects()->count();
        $memberCount = $client->memberships()->count();
        $issueCount = Issue::query()
            ->whereIn('project_id', $client->projects()->select('id'))
            ->count();
        $boardCount = Board::query()
            ->whereIn('project_id', $client->projects()->select('id'))
            ->count();

        return [
            'type' => 'client_detail',
            'id' => $client->id,
            'name' => $client->name,
            'email' => $client->email,
            'behavior' => $client->behavior?->name,
            'country_of_origin' => $client->country_of_origin,
            'industry' => $client->industry,
            'origin' => $client->origin,
            'birthday' => $client->birthday?->toDateString(),
            'date_of_first_interaction' => $client->date_of_first_interaction?->toDateString(),
            'notes' => $client->notes,
            'stats' => [
                'members' => $memberCount,
                'projects' => $projectCount,
                'issues' => $issueCount,
                'boards' => $boardCount,
            ],
            'created_at' => $client->created_at?->toDateTimeString(),
        ];
    }

    private function executeGetProjectDetail(User $user, array $payload): array
    {
        $project = Project::findOrFail($payload['project_id']);

        abort_unless($user->hasProjectAccess($project), 403);

        $project->load(['client:id,name', 'status:id,name,slug']);

        $issueCount = $project->issues()->count();
        $boardCount = $project->boards()->count();
        $transactionCount = $project->transactions()->count();
        $invoiceCount = $project->invoices()->count();

        return [
            'type' => 'project_detail',
            'id' => $project->id,
            'name' => $project->name,
            'description' => $project->description,
            'client' => $project->client?->only(['id', 'name']),
            'status' => $project->status?->name,
            'budget' => $project->budget ? (string) $project->budget : null,
            'currency' => $project->currency,
            'starts_at' => $project->starts_at?->toDateString(),
            'ends_at' => $project->ends_at?->toDateString(),
            'notes' => $project->notes,
            'stats' => [
                'issues' => $issueCount,
                'boards' => $boardCount,
                'transactions' => $transactionCount,
                'invoices' => $invoiceCount,
            ],
            'created_at' => $project->created_at?->toDateTimeString(),
        ];
    }
}
