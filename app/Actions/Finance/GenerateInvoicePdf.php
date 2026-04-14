<?php

namespace App\Actions\Finance;

use App\Models\Invoice;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class GenerateInvoicePdf
{
    public function prepare(Invoice $invoice): Invoice
    {
        $expectedPublicId = $this->desiredPublicId($invoice);

        if ($invoice->public_id !== $expectedPublicId) {
            $invoice->forceFill([
                'public_id' => $expectedPublicId,
            ])->saveQuietly();
            $invoice->refresh();
        }

        if (! $invoice->items()->exists()) {
            $amount = round((float) $invoice->amount, 2);

            $invoice->items()->create([
                'position' => 1,
                'description' => 'Invoice '.$invoice->reference,
                'hours' => null,
                'rate' => null,
                'base_amount' => $amount,
                'amount' => $amount,
            ]);

            $invoice->forceFill([
                'subtotal_amount' => $amount,
                'discount_total_amount' => 0,
            ])->saveQuietly();
            $invoice->refresh();
        }

        return $invoice;
    }

    public function render(Invoice $invoice): string
    {
        $invoice->loadMissing([
            'project.client',
            'items.discounts',
            'discounts.item',
        ]);

        return Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'publicUrl' => route('invoices.public.show', $invoice->public_id),
        ])
            ->setOption('isRemoteEnabled', true)
            ->setPaper('a4')
            ->output();
    }

    public function store(Invoice $invoice): Invoice
    {
        $invoice = $this->prepare($invoice);

        $path = 'invoices/'.$invoice->public_id.'.pdf';

        if ($invoice->public_pdf_path && $invoice->public_pdf_path !== $path) {
            Storage::disk('local')->delete($invoice->public_pdf_path);
        }

        Storage::disk('local')->put($path, $this->render($invoice));

        $invoice->forceFill([
            'public_pdf_path' => $path,
            'public_pdf_generated_at' => now(),
        ])->saveQuietly();

        return $invoice->fresh(['project.client', 'items.discounts', 'discounts.item']);
    }

    public function ensureStored(Invoice $invoice): Invoice
    {
        $invoice = $this->prepare($invoice);

        $expectedPath = 'invoices/'.$invoice->public_id.'.pdf';

        if ($invoice->public_pdf_path !== $expectedPath) {
            return $this->store($invoice);
        }

        if (
            $invoice->public_pdf_generated_at === null
            || $invoice->updated_at === null
            || $invoice->public_pdf_generated_at->lt($invoice->updated_at)
        ) {
            return $this->store($invoice);
        }

        if (! $invoice->public_pdf_path || ! Storage::disk('local')->exists($invoice->public_pdf_path)) {
            return $this->store($invoice);
        }

        return $invoice;
    }

    public function deleteStored(Invoice $invoice): void
    {
        if ($invoice->public_pdf_path) {
            Storage::disk('local')->delete($invoice->public_pdf_path);
        }
    }

    private function desiredPublicId(Invoice $invoice): string
    {
        $base = Str::of($invoice->reference)
            ->lower()
            ->slug('-')
            ->value();

        $base = $base !== '' ? $base : 'invoice-'.$invoice->id;

        $conflictExists = Invoice::query()
            ->where('public_id', $base)
            ->where('id', '!=', $invoice->id)
            ->exists();

        if (! $conflictExists) {
            return $base;
        }

        return $base.'-'.$invoice->id;
    }
}
