<?php

namespace App\Actions\Finance;

use App\Models\AuditLog;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Support\Facades\DB;

class CreateInvoice
{
    public function __construct(
        private readonly SyncInvoiceDocument $syncInvoiceDocument,
        private readonly GenerateInvoicePdf $generateInvoicePdf,
    ) {}

    public function handle(
        User $actor,
        Project $project,
        array $attributes,
        string $source = 'manual_ui',
    ): Invoice {
        if (! $actor->canManageProjectFinance($project)) {
            throw new AuthorizationException('You are not allowed to create invoices for this project.');
        }

        $invoice = DB::transaction(function () use ($actor, $project, $attributes, $source): Invoice {
            $invoice = Invoice::query()->create([
                'project_id' => $project->id,
                'reference' => $attributes['reference'],
                'status' => $attributes['status'] ?? 'draft',
                'currency' => $attributes['currency'] ?? 'EGP',
                'subtotal_amount' => 0,
                'discount_total_amount' => 0,
                'amount' => 0,
                'issued_at' => $attributes['issued_at'] ?? null,
                'due_at' => null,
                'paid_at' => null,
                'notes' => $attributes['notes'] ?? null,
                'public_id' => null,
            ]);

            $invoice = $this->syncInvoiceDocument->handle($invoice, $attributes);

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
                    'currency' => $invoice->currency,
                ],
                'after_json' => $this->snapshot($invoice),
            ]);

            return $invoice;
        });

        return $this->generateInvoicePdf->store($invoice);
    }

    private function snapshot(Invoice $invoice): array
    {
        return [
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
            'items' => $invoice->items->map(fn ($item) => [
                'description' => $item->description,
                'hours' => $item->hours,
                'rate' => $item->rate,
                'base_amount' => $item->base_amount,
                'amount' => $item->amount,
            ])->values()->all(),
            'discounts' => $invoice->discounts->map(fn ($discount) => [
                'invoice_item_id' => $discount->invoice_item_id,
                'label' => $discount->label,
                'type' => $discount->type,
                'value' => $discount->value,
                'amount' => $discount->amount,
            ])->values()->all(),
        ];
    }
}
