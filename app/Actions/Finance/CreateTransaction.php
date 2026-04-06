<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class CreateTransaction
{
    public function handle(
        User $actor,
        Project $project,
        array $attributes,
        string $source = 'manual_ui',
    ): Transaction {
        if (! $actor->canManageProject($project)) {
            throw new AuthorizationException('You are not allowed to create transactions for this project.');
        }

        $transaction = Transaction::query()->create([
            'project_id' => $project->id,
            'description' => $attributes['description'],
            'amount' => $attributes['amount'],
            'occurred_at' => $attributes['occurred_at'],
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'transaction.created',
            'source' => $source,
            'subject_type' => Transaction::class,
            'subject_id' => $transaction->id,
            'metadata_json' => [
                'project_id' => $project->id,
                'amount' => $transaction->amount,
            ],
            'after_json' => [
                'id' => $transaction->id,
                'project_id' => $transaction->project_id,
                'description' => $transaction->description,
                'amount' => $transaction->amount,
                'occurred_at' => $transaction->occurred_at?->toDateString(),
            ],
        ]);

        return $transaction->load('project.client');
    }
}
