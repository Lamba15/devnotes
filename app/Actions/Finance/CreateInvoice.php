<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;

class CreateInvoice
{
    public function handle(
        User $actor,
        Project $project,
        array $attributes,
        string $source = 'manual_ui',
    ): Invoice {
        if (! $actor->canManageProject($project)) {
            throw new AuthorizationException('You are not allowed to create invoices for this project.');
        }

        $invoice = Invoice::query()->create([
            'project_id' => $project->id,
            'reference' => $attributes['reference'],
            'status' => $attributes['status'],
            'amount' => $attributes['amount'],
            'issued_at' => $attributes['issued_at'] ?? null,
            'due_at' => $attributes['due_at'] ?? null,
            'paid_at' => $attributes['paid_at'] ?? null,
            'notes' => $attributes['notes'] ?? null,
        ]);

        AuditLog::query()->create([
            'user_id' => $actor->id,
            'event' => 'invoice.created',
            'source' => $source,
            'subject_type' => Invoice::class,
            'subject_id' => $invoice->id,
            'metadata_json' => [
                'project_id' => $project->id,
                'status' => $invoice->status,
                'amount' => $invoice->amount,
            ],
            'after_json' => [
                'id' => $invoice->id,
                'project_id' => $invoice->project_id,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'amount' => $invoice->amount,
                'issued_at' => $invoice->issued_at?->toDateString(),
                'due_at' => $invoice->due_at?->toDateString(),
                'paid_at' => $invoice->paid_at?->toDateString(),
            ],
        ]);

        return $invoice->load('project.client');
    }
}
