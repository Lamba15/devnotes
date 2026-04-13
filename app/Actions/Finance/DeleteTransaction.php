<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteTransaction
{
    public function handle(User $actor, Transaction $transaction, string $source = 'manual_ui'): void
    {
        if (! $actor->canManageProjectFinance($transaction->project)) {
            throw new AuthorizationException('You are not allowed to delete this transaction.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'transaction.deleted',
            'source' => $source,
            'subject_type' => Transaction::class,
            'subject_id' => $transaction->id,
        ]);

        $transaction->delete();
    }
}
