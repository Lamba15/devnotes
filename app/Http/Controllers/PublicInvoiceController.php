<?php

namespace App\Http\Controllers;

use App\Actions\Finance\GenerateInvoicePdf;
use App\Models\Invoice;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class PublicInvoiceController extends Controller
{
    public function show(string $publicInvoiceId, GenerateInvoicePdf $generateInvoicePdf): HttpResponse
    {
        $invoice = Invoice::query()
            ->where('public_id', $publicInvoiceId)
            ->firstOrFail();

        $invoice = $generateInvoicePdf->store($invoice->fresh(['project.client', 'items.discounts', 'discounts.item']));

        $slug = Str::slug($invoice->reference);
        $filename = 'invoice-'.$slug.'.pdf';

        return response()->file(Storage::disk('local')->path($invoice->public_pdf_path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
            'Cache-Control' => 'public, max-age=300',
        ]);
    }
}
