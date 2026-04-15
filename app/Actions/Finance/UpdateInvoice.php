<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class UpdateInvoice
{
    public function __construct(
        private readonly SyncInvoiceDocument $syncInvoiceDocument,
        private readonly GenerateInvoicePdf $generateInvoicePdf,
    ) {}

    public function handle(User $actor, Invoice $invoice, Project $project, array $attributes, string $source = 'manual_ui'): Invoice
    {
        if (! $actor->canManageProjectFinance($project) || ! $actor->canManageProjectFinance($invoice->project)) {
            throw new AuthorizationException('You are not allowed to update invoices for this client.');
        }

        $invoice = DB::transaction(function () use ($actor, $invoice, $project, $attributes, $source): Invoice {
            $invoice->fill([
                'project_id' => $project->id,
                'reference' => $attributes['reference'],
                'status' => $attributes['status'] ?? $invoice->status ?? 'draft',
                'currency' => $attributes['currency'] ?? 'EGP',
                'issued_at' => $attributes['issued_at'] ?? null,
                'due_at' => $attributes['due_at'] ?? null,
                'paid_at' => $attributes['paid_at'] ?? null,
                'notes' => $attributes['notes'] ?? null,
            ]);
            $invoice->save();

            $invoice = $this->syncInvoiceDocument->handle($invoice, $attributes);

            AuditLog::query()->create([
                'user_id' => $actor->id,
                'event' => 'invoice.updated',
                'source' => $source,
                'subject_type' => Invoice::class,
                'subject_id' => $invoice->id,
                'after_json' => [
                    'id' => $invoice->id,
                    'project_id' => $invoice->project_id,
                    'reference' => $invoice->reference,
                    'status' => $invoice->status,
                    'currency' => $invoice->currency,
                    'subtotal_amount' => $invoice->subtotal_amount,
                    'discount_total_amount' => $invoice->discount_total_amount,
                    'amount' => $invoice->amount,
                    'issued_at' => $invoice->issued_at?->toDateString(),
                    'due_at' => $invoice->due_at?->toDateString(),
                    'paid_at' => $invoice->paid_at?->toDateString(),
                ],
            ]);

            return $invoice;
        });

        return $this->generateInvoicePdf->store($invoice);
    }
}
