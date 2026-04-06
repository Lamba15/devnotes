<?php

namespace App\AI;

use App\Models\User;

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
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'description' => ['type' => 'string'],
                        'amount' => ['type' => ['number', 'string']],
                        'occurred_at' => ['type' => 'string'],
                    ],
                    'required' => ['project_id', 'description', 'amount', 'occurred_at'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_transactions',
                'description' => 'List transactions available to the current user.',
                'skill' => 'finance_ops',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
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
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
                'input_schema' => [
                    'type' => 'object',
                    'properties' => [
                        'project_id' => ['type' => 'integer'],
                        'reference' => ['type' => 'string'],
                        'status' => ['type' => 'string'],
                        'amount' => ['type' => ['number', 'string']],
                        'issued_at' => ['type' => ['string', 'null']],
                        'due_at' => ['type' => ['string', 'null']],
                        'paid_at' => ['type' => ['string', 'null']],
                        'notes' => ['type' => ['string', 'null']],
                    ],
                    'required' => ['project_id', 'reference', 'status', 'amount'],
                    'additionalProperties' => false,
                ],
            ],
            [
                'name' => 'list_accessible_invoices',
                'description' => 'List invoices available to the current user.',
                'skill' => 'finance_ops',
                'requires_confirmation' => false,
                'guard' => fn (User $user): bool => $user->isPlatformOwner()
                    || $user->clientMemberships()->whereIn('role', ['owner', 'admin'])->exists(),
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
        ];
    }
}
