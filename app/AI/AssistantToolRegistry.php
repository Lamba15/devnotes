<?php

namespace App\AI;

use App\Models\ClientMembership;
use App\Models\Project;
use App\Models\User;
use App\Support\ClientPermissionCatalog;

class AssistantToolRegistry
{
    public function forUser(User $user): array
    {
        return collect($this->definitions())
            ->filter(fn (array $tool) => ($tool['guard'])($user))
            ->map(function (array $tool): array {
                unset($tool['guard']);

                return $tool;
            })
            ->values()
            ->all();
    }

    public function find(User $user, string $toolName): ?array
    {
        return collect($this->definitions())
            ->first(function (array $tool) use ($toolName, $user): bool {
                return $tool['name'] === $toolName && ($tool['guard'])($user);
            });
    }

    private function definitions(): array
    {
        return [
            [
                'name' => 'create_client',
                'description' => 'Create a new client visible to the current user.',
                'skill' => 'client_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'name' => ['type' => 'string'],
                        'behavior_id' => ['type' => ['integer', 'null']],
                    ],
                    'required' => ['name'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_client',
                'description' => 'Update a client record visible to the current user.',
                'skill' => 'client_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                        'name' => ['type' => ['string', 'null']],
                        'email' => ['type' => ['string', 'null']],
                        'behavior_id' => ['type' => ['integer', 'null']],
                    ],
                    'required' => ['client_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'create_project',
                'description' => 'Create a new project inside a client the current user can manage.',
                'skill' => 'project_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                        'status_id' => ['type' => 'integer'],
                        'name' => ['type' => 'string'],
                        'description' => ['type' => ['string', 'null']],
                    ],
                    'required' => ['client_id', 'status_id', 'name'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_clients',
                'description' => 'List clients available to the current user.',
                'skill' => 'client_management',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_projects',
                'description' => 'List projects available to the current user.',
                'skill' => 'project_management',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => ['integer', 'null']],
                        'status_id' => ['type' => ['integer', 'null']],
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'create_issue',
                'description' => 'Create an issue in a project the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'title' => ['type' => 'string'],
                        'description' => ['type' => ['string', 'null']],
                        'status' => ['type' => 'string'],
                        'priority' => ['type' => 'string'],
                        'type' => ['type' => 'string'],
                        'assignee_id' => ['type' => ['integer', 'null']],
                    ],
                    'required' => ['project_id', 'title', 'status', 'priority', 'type'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_issue',
                'description' => 'Update an issue the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                        'title' => ['type' => 'string'],
                        'description' => ['type' => ['string', 'null']],
                        'status' => ['type' => 'string'],
                        'priority' => ['type' => 'string'],
                        'type' => ['type' => 'string'],
                        'assignee_id' => ['type' => ['integer', 'null']],
                    ],
                    'required' => ['issue_id', 'title', 'status', 'priority', 'type'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_issues',
                'description' => 'List issues available to the current user.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => ['integer', 'null']],
                        'status' => ['type' => ['string', 'null']],
                        'priority' => ['type' => ['string', 'null']],
                        'type' => ['type' => ['string', 'null']],
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_issue_discussion',
                'description' => 'Read the threaded discussion for an issue available to the current user.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                    ],
                    'required' => ['issue_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_issue_detail',
                'description' => 'Read the detailed issue view including fields and threaded discussion for an issue available to the current user.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                    ],
                    'required' => ['issue_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_board_context',
                'description' => 'Read board columns, placed issues, and backlog for a board available to the current user.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'board_id' => ['type' => 'integer'],
                    ],
                    'required' => ['board_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_boards',
                'description' => 'List boards available to the current user.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => ['integer', 'null']],
                        'project_id' => ['type' => ['integer', 'null']],
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'create_board',
                'description' => 'Create a board in a client the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                        'project_id' => ['type' => 'integer'],
                        'name' => ['type' => 'string'],
                        'columns' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'name' => ['type' => 'string'],
                                    'updates_status' => ['type' => ['boolean', 'null']],
                                    'mapped_status' => ['type' => ['string', 'null']],
                                ],
                                'required' => ['name'],
                                'additionalProperties' => false,
                            ],
                        ],
                    ],
                    'required' => ['client_id', 'project_id', 'name'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_board',
                'description' => 'Update a board the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'board_id' => ['type' => 'integer'],
                        'project_id' => ['type' => ['integer', 'null']],
                        'name' => ['type' => ['string', 'null']],
                        'columns' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'id' => ['type' => ['integer', 'null']],
                                    'name' => ['type' => 'string'],
                                    'updates_status' => ['type' => ['boolean', 'null']],
                                    'mapped_status' => ['type' => ['string', 'null']],
                                ],
                                'required' => ['name'],
                                'additionalProperties' => false,
                            ],
                        ],
                    ],
                    'required' => ['board_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_board',
                'description' => 'Delete a board the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'board_id' => ['type' => 'integer'],
                    ],
                    'required' => ['board_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'move_issue_on_board',
                'description' => 'Move an issue onto a board column the current user can move issues on.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists()
                    || ($user->clientMemberships()->where('role', 'member')->exists()
                        && $user->projectMemberships()->exists()
                        && $user->boardMemberships()->exists()),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'board_id' => ['type' => 'integer'],
                        'issue_id' => ['type' => 'integer'],
                        'column_id' => ['type' => 'integer'],
                    ],
                    'required' => ['board_id', 'issue_id', 'column_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'move_issues_on_board',
                'description' => 'Move multiple issues onto the same board column in one confirmed action.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists()
                    || ($user->clientMemberships()->where('role', 'member')->exists()
                        && $user->projectMemberships()->exists()
                        && $user->boardMemberships()->exists()),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'board_id' => ['type' => 'integer'],
                        'issue_ids' => [
                            'type' => 'array',
                            'items' => ['type' => 'integer'],
                            'minItems' => 1,
                        ],
                        'column_id' => ['type' => 'integer'],
                    ],
                    'required' => ['board_id', 'issue_ids', 'column_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'add_issue_comment',
                'description' => 'Add a comment to an issue the current user can comment on.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists()
                    || ($user->clientMemberships()->where('role', 'member')->exists()
                        && $user->projectMemberships()->exists()),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                        'body' => ['type' => 'string'],
                    ],
                    'required' => ['issue_id', 'body'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'reply_to_issue_comment',
                'description' => 'Reply to an existing issue comment the current user can comment on.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists()
                    || ($user->clientMemberships()->where('role', 'member')->exists()
                        && $user->projectMemberships()->exists()),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                        'parent_id' => ['type' => 'integer'],
                        'body' => ['type' => 'string'],
                    ],
                    'required' => ['issue_id', 'parent_id', 'body'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'create_transaction',
                'description' => 'Create a transaction for a project the current user can manage.',
                'skill' => 'finance_ops',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'description' => ['type' => 'string'],
                        'amount' => ['type' => ['number', 'string']],
                        'occurred_date' => ['type' => 'string'],
                    ],
                    'required' => ['project_id', 'description', 'amount', 'occurred_date'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_transactions',
                'description' => 'List transactions available to the current user.',
                'skill' => 'finance_ops',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => ['integer', 'null']],
                        'project_id' => ['type' => ['integer', 'null']],
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'create_invoice',
                'description' => 'Create an invoice for a project the current user can manage.',
                'skill' => 'finance_ops',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'reference' => ['type' => 'string'],
                        'status' => ['type' => 'string'],
                        'currency' => ['type' => ['string', 'null']],
                        'amount' => ['type' => ['number', 'string', 'null']],
                        'items' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'description' => ['type' => 'string'],
                                    'hours' => ['type' => ['number', 'string', 'null']],
                                    'rate' => ['type' => ['number', 'string', 'null']],
                                    'amount' => ['type' => ['number', 'string', 'null']],
                                ],
                                'required' => ['description'],
                                'additionalProperties' => false,
                            ],
                        ],
                        'discounts' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'label' => ['type' => ['string', 'null']],
                                    'type' => ['type' => 'string'],
                                    'value' => ['type' => ['number', 'string']],
                                    'target_type' => ['type' => ['string', 'null']],
                                    'target_item_index' => ['type' => ['integer', 'null']],
                                ],
                                'required' => ['type', 'value'],
                                'additionalProperties' => false,
                            ],
                        ],
                        'issued_at' => ['type' => ['string', 'null']],
                        'due_at' => ['type' => ['string', 'null']],
                        'paid_at' => ['type' => ['string', 'null']],
                        'notes' => ['type' => ['string', 'null']],
                    ],
                    'required' => ['project_id', 'reference', 'status'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_invoices',
                'description' => 'List invoices available to the current user.',
                'skill' => 'finance_ops',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => ['integer', 'null']],
                        'project_id' => ['type' => ['integer', 'null']],
                        'status' => ['type' => ['string', 'null']],
                        'search' => ['type' => ['string', 'null']],
                        'sort_by' => ['type' => ['string', 'null']],
                        'sort_direction' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_audit_logs',
                'description' => 'List recent audit log entries. Platform owner only.',
                'skill' => 'platform_admin',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->isPlatformOwner(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'search' => ['type' => ['string', 'null']],
                        'event' => ['type' => ['string', 'null']],
                        'source' => ['type' => ['string', 'null']],
                        'limit' => [
                            'type' => ['integer', 'null'],
                            'minimum' => 1,
                            'maximum' => 50,
                        ],
                    ],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_platform_stats',
                'description' => 'Get platform-wide dashboard stats including entity counts, issue distributions (by status, priority), invoice totals by status, overdue/unassigned issue counts, and total invoiced/transacted amounts. Platform owner only.',
                'skill' => 'platform_admin',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->isPlatformOwner(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => new \stdClass,
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'manage_user_credits',
                'description' => 'Set AI credits for a user. Use -1 for unlimited, 0 for none. Platform owner only.',
                'skill' => 'platform_admin',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'user_id' => ['type' => 'integer'],
                        'ai_credits' => ['type' => 'integer', 'minimum' => -1],
                    ],
                    'required' => ['user_id', 'ai_credits'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_issue',
                'description' => 'Delete an issue the current user can manage.',
                'skill' => 'issue_tracking',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'issue_id' => ['type' => 'integer'],
                    ],
                    'required' => ['issue_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_project',
                'description' => 'Update a project the current user can manage.',
                'skill' => 'project_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'name' => ['type' => ['string', 'null']],
                        'description' => ['type' => ['string', 'null']],
                        'status_id' => ['type' => ['integer', 'null']],
                    ],
                    'required' => ['project_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_transaction',
                'description' => 'Update a transaction the current user can manage.',
                'skill' => 'finance_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'transaction_id' => ['type' => 'integer'],
                        'description' => ['type' => ['string', 'null']],
                        'amount' => ['type' => ['number', 'null']],
                        'category' => ['type' => ['string', 'null']],
                    ],
                    'required' => ['transaction_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'update_invoice',
                'description' => 'Update an invoice the current user can manage.',
                'skill' => 'finance_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'invoice_id' => ['type' => 'integer'],
                        'reference' => ['type' => ['string', 'null']],
                        'status' => ['type' => ['string', 'null']],
                        'currency' => ['type' => ['string', 'null']],
                        'amount' => ['type' => ['number', 'string', 'null']],
                        'items' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'description' => ['type' => 'string'],
                                    'hours' => ['type' => ['number', 'string', 'null']],
                                    'rate' => ['type' => ['number', 'string', 'null']],
                                    'amount' => ['type' => ['number', 'string', 'null']],
                                ],
                                'required' => ['description'],
                                'additionalProperties' => false,
                            ],
                        ],
                        'discounts' => [
                            'type' => ['array', 'null'],
                            'items' => [
                                'type' => 'object',
                                'properties' => [
                                    'label' => ['type' => ['string', 'null']],
                                    'type' => ['type' => 'string'],
                                    'value' => ['type' => ['number', 'string']],
                                    'target_type' => ['type' => ['string', 'null']],
                                    'target_item_index' => ['type' => ['integer', 'null']],
                                ],
                                'required' => ['type', 'value'],
                                'additionalProperties' => false,
                            ],
                        ],
                        'notes' => ['type' => ['string', 'null']],
                        'issued_at' => ['type' => ['string', 'null']],
                        'due_at' => ['type' => ['string', 'null']],
                        'paid_at' => ['type' => ['string', 'null']],
                    ],
                    'required' => ['invoice_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_project',
                'description' => 'Delete a project the current user can manage.',
                'skill' => 'project_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                    ],
                    'required' => ['project_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_client_members',
                'description' => 'List all members of a client the current user can access.',
                'skill' => 'client_management',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                    ],
                    'required' => ['client_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_client',
                'description' => 'Delete a client record. Only platform owners can delete clients.',
                'skill' => 'client_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $user->isPlatformOwner(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                    ],
                    'required' => ['client_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_transaction',
                'description' => 'Delete a financial transaction the current user can manage.',
                'skill' => 'finance_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'transaction_id' => ['type' => 'integer'],
                    ],
                    'required' => ['transaction_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'delete_invoice',
                'description' => 'Delete an invoice the current user can manage.',
                'skill' => 'finance_management',
                'requires_confirmation' => true,
                'guard' => fn (User $user): bool => $this->hasAnyFinanceWriteAccess($user),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'invoice_id' => ['type' => 'integer'],
                    ],
                    'required' => ['invoice_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_client_detail',
                'description' => 'Get detailed information about a specific client including profile, stats, and recent activity.',
                'skill' => 'client_management',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'client_id' => ['type' => 'integer'],
                    ],
                    'required' => ['client_id'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'get_project_detail',
                'description' => 'Get detailed information about a specific project including stats, budget, and status.',
                'skill' => 'project_management',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->exists,
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                    ],
                    'required' => ['project_id'],
                    'additionalProperties' => false,
                ],
            ],
        ];
    }

    private function hasAnyFinanceAccess(User $user): bool
    {
        if ($user->isPlatformOwner()) {
            return true;
        }

        return $user->workspaceAccess()
            ->scopeAccessibleFinanceProjects(Project::query())
            ->exists();
    }

    private function hasAnyFinanceWriteAccess(User $user): bool
    {
        if ($user->isPlatformOwner()) {
            return true;
        }

        return $user->clientMemberships()
            ->with('permissions')
            ->get()
            ->contains(function (ClientMembership $membership): bool {
                return in_array($membership->normalizedRole(), ['owner', 'admin'], true)
                    || in_array(ClientPermissionCatalog::FINANCE_WRITE, $membership->permissionNames(), true);
            });
    }
}
