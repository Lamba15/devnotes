<?php

namespace App\AI;

use App\Actions\Clients\CreateClient;
use App\Actions\Clients\UpdateClient;
use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\CreateTransaction;
use App\Actions\Projects\CreateProject;
use App\Actions\Tracking\CreateIssue;
use App\Actions\Tracking\CreateIssueComment;
use App\Actions\Tracking\MoveIssueOnBoard;
use App\Actions\Tracking\UpdateIssue;
use App\Models\AssistantActionConfirmation;
use App\Models\Board;
use App\Models\BoardColumn;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\IssueComment;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class AssistantToolExecutor
{
    public function __construct(
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
            'move_issue_on_board' => $this->executeMoveIssueOnBoard($user, $payload, $confirmation),
            'move_issues_on_board' => $this->executeMoveIssuesOnBoard($user, $payload, $confirmation),
            'add_issue_comment' => $this->executeAddIssueComment($user, $payload, $confirmation),
            'reply_to_issue_comment' => $this->executeReplyToIssueComment($user, $payload, $confirmation),
            'create_transaction' => $this->executeCreateTransaction($user, $payload, $confirmation),
            'list_accessible_transactions' => $this->executeListAccessibleTransactions($user, $payload),
            'create_invoice' => $this->executeCreateInvoice($user, $payload, $confirmation),
            'list_accessible_invoices' => $this->executeListAccessibleInvoices($user, $payload),
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
        $sortBy = $this->normalizeSortBy($payload['sort_by'] ?? null, ['id', 'description', 'amount', 'occurred_at', 'created_at'], 'id');
        $sortDirection = $this->normalizeSortDirection($payload['sort_direction'] ?? null);

        $transactions = Transaction::query()
            ->with('project.client')
            ->when(
                ! $user->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $projectQuery->whereIn(
                        'client_id',
                        $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->pluck('client_id')
                    )
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
                'occurred_at' => $transaction->occurred_at?->toDateString(),
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
            ->with(['project.client', 'assignee:id,name', 'comments.user:id,name'])
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
                'assignee' => $issue->assignee?->only(['id', 'name']),
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
                    fn ($projectQuery) => $projectQuery->whereIn(
                        'client_id',
                        $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->pluck('client_id')
                    )
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
}
