<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class UpdateInvoice
{
    public function handle(User $actor, Invoice $invoice, Project $project, array $attributes, string $source = 'manual_ui'): Invoice
    {
        if (! $actor->canManageClient($project->client)) {
            throw new AuthorizationException('You are not allowed to update invoices for this client.');
        }

        $invoice->fill([
            'project_id' => $project->id,
            'reference' => $attributes['reference'],
            'status' => $attributes['status'],
            'amount' => $attributes['amount'],
            'issued_at' => $attributes['issued_at'] ?? null,
            'due_at' => $attributes['due_at'] ?? null,
            'paid_at' => $attributes['paid_at'] ?? null,
            'notes' => $attributes['notes'] ?? null,
        ]);
        $invoice->save();

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'invoice.updated',
            'source' => $source,
            'subject_type' => Invoice::class,
            'subject_id' => $invoice->id,
        ]);

        return $invoice->fresh(['project.client']);
    }
}
