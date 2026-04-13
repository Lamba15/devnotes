<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Project;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateTransaction
{
    public function handle(User $actor, Transaction $transaction, Project $project, array $attributes, string $source = 'manual_ui'): Transaction
    {
        if (! $actor->canManageProjectFinance($project)) {
            throw new AuthorizationException('You are not allowed to update transactions for this client.');
        }

        $transaction->fill([
            'project_id' => $project->id,
            'description' => $attributes['description'],
            'amount' => $attributes['amount'],
            'occurred_at' => $attributes['occurred_at'],
            'category' => $attributes['category'] ?? null,
            'currency' => $attributes['currency'] ?? 'USD',
        ]);
        $transaction->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'transaction.updated',
            'source' => $source,
            'subject_type' => Transaction::class,
            'subject_id' => $transaction->id,
        ]);

        return $transaction->fresh(['project.client']);
    }
}
