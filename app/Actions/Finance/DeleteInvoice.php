<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class DeleteInvoice
{
    public function handle(User $actor, Invoice $invoice, string $source = 'manual_ui'): void
    {
        if (! $actor->canManageProjectFinance($invoice->project)) {
            throw new AuthorizationException('You are not allowed to delete this invoice.');
        }

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'invoice.deleted',
            'source' => $source,
            'subject_type' => Invoice::class,
            'subject_id' => $invoice->id,
        ]);

        $invoice->delete();
    }
}
