<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\DeleteInvoice;
use App\Actions\Finance\GenerateInvoicePdf;
use App\Actions\Finance\UpdateInvoice;
use App\Models\Invoice;
use App\Models\Project;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class InvoiceController extends Controller
{
    public function show(Request $request, Invoice $invoice, GenerateInvoicePdf $generateInvoicePdf): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        if (! $invoice->public_id || ! $invoice->items()->exists()) {
            $invoice = $generateInvoicePdf->prepare($invoice);
        }

        $invoice->load(['project.client:id,name', 'items.discounts', 'discounts']);

        return Inertia::render('finance/invoices-show', [
            'invoice' => [
                'id' => $invoice->id,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'subtotal_amount' => (string) $invoice->subtotal_amount,
                'discount_total_amount' => (string) $invoice->discount_total_amount,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency ?? 'EGP',
                'issued_at' => $invoice->issued_at?->toDateString() ?? '',
                'due_at' => $invoice->due_at?->toDateString() ?? '',
                'paid_at' => $invoice->paid_at?->toDateString() ?? '',
                'created_at' => $invoice->created_at?->toISOString(),
                'public_pdf_generated_at' => $invoice->public_pdf_generated_at?->toISOString(),
                'notes' => $invoice->notes ?? '',
                'pdf_url' => route('finance.invoices.pdf', $invoice),
                'public_url' => route('invoices.public.show', $invoice->public_id),
                'project' => [
                    'id' => $invoice->project->id,
                    'name' => $invoice->project->name,
                    'client' => $invoice->project->client?->only(['id', 'name']),
                ],
                'items' => $invoice->items->map(fn ($item) => [
                    'id' => $item->id,
                    'description' => $item->description,
                    'hours' => $item->hours !== null ? (string) $item->hours : null,
                    'rate' => $item->rate !== null ? (string) $item->rate : null,
                    'base_amount' => (string) $item->base_amount,
                    'amount' => (string) $item->amount,
                    'discounts' => $item->discounts->map(fn ($discount) => [
                        'id' => $discount->id,
                        'label' => $discount->label ?: 'Item discount',
                        'type' => $discount->type,
                        'value' => (string) $discount->value,
                        'amount' => (string) $discount->amount,
                    ])->values()->all(),
                ])->values()->all(),
                'invoice_discounts' => $invoice->discounts
                    ->whereNull('invoice_item_id')
                    ->values()
                    ->map(fn ($discount) => [
                        'id' => $discount->id,
                        'label' => $discount->label ?: 'Invoice discount',
                        'type' => $discount->type,
                        'value' => (string) $discount->value,
                        'amount' => (string) $discount->amount,
                    ])
                    ->all(),
            ],
        ]);
    }

    public function edit(Request $request, Invoice $invoice, GenerateInvoicePdf $generateInvoicePdf): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        if (! $invoice->public_id || ! $invoice->items()->exists()) {
            $invoice = $generateInvoicePdf->prepare($invoice);
        }

        $invoice->load(['items.discounts', 'discounts']);

        return Inertia::render('finance/invoices-edit', [
            'invoice' => [
                'id' => $invoice->id,
                'project_id' => $invoice->project_id,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'subtotal_amount' => (string) $invoice->subtotal_amount,
                'discount_total_amount' => (string) $invoice->discount_total_amount,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency ?? 'EGP',
                'issued_at' => $invoice->issued_at?->toDateString() ?? '',
                'due_at' => $invoice->due_at?->toDateString() ?? '',
                'paid_at' => $invoice->paid_at?->toDateString() ?? '',
                'notes' => $invoice->notes ?? '',
                'items' => $invoice->items->map(fn ($item) => [
                    'description' => $item->description,
                    'hours' => $item->hours !== null ? (string) $item->hours : '',
                    'rate' => $item->rate !== null ? (string) $item->rate : '',
                    'amount' => $item->hours !== null && $item->rate !== null ? '' : (string) $item->base_amount,
                ])->values()->all(),
                'discounts' => $invoice->discounts->map(function ($discount) use ($invoice) {
                    $targetItemIndex = $discount->invoice_item_id
                        ? $invoice->items->search(fn ($item) => $item->id === $discount->invoice_item_id)
                        : null;

                    return [
                        'label' => $discount->label ?? '',
                        'type' => $discount->type,
                        'value' => (string) $discount->value,
                        'target_type' => $discount->invoice_item_id ? 'item' : 'invoice',
                        'target_item_index' => $targetItemIndex !== false && $targetItemIndex !== null ? (string) $targetItemIndex : '',
                    ];
                })->values()->all(),
            ],
            'projects' => $user->workspaceAccess()
                ->scopeAccessibleFinanceProjects(
                    Project::query()->with('client:id,name'),
                )
                ->orderBy('name')
                ->get(),
        ]);
    }

    public function store(Request $request, CreateInvoice $createInvoice): RedirectResponse
    {
        $validated = $this->validateInvoicePayload($request);

        $project = Project::query()->findOrFail($validated['project_id']);

        $createInvoice->handle($request->user(), $project, $validated);

        return to_route('finance.invoices.index');
    }

    public function update(Request $request, Invoice $invoice, UpdateInvoice $updateInvoice): RedirectResponse
    {
        $validated = $this->validateInvoicePayload($request);

        $project = Project::query()->findOrFail($validated['project_id']);
        $updateInvoice->handle($request->user(), $invoice, $project, $validated);

        return to_route('finance.invoices.index');
    }

    public function destroy(Request $request, Invoice $invoice, DeleteInvoice $deleteInvoice): RedirectResponse
    {
        $deleteInvoice->handle($request->user(), $invoice);

        return to_route('finance.invoices.index');
    }

    public function exportPdf(Request $request, Invoice $invoice, GenerateInvoicePdf $generateInvoicePdf): HttpResponse
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        $invoice = $generateInvoicePdf->store($invoice->fresh(['project.client', 'items.discounts', 'discounts.item']));

        $slug = Str::slug($invoice->reference);
        $filename = 'invoice-'.$slug.'-'.now()->format('Y-m-d').'.pdf';

        return response()->file(Storage::disk('local')->path($invoice->public_pdf_path), [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }

    private function validateInvoicePayload(Request $request): array
    {
        $currentInvoice = $request->route('invoice');

        return $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'reference' => [
                'required',
                'string',
                'max:255',
                Rule::unique('invoices', 'reference')->ignore($currentInvoice?->id),
            ],
            'status' => ['required', Rule::in(['draft', 'pending', 'paid', 'overdue'])],
            'currency' => ['nullable', 'string', 'size:3'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'amount' => ['nullable', 'numeric'],
            'items' => ['nullable', 'array', 'min:1'],
            'items.*.description' => ['nullable', 'string', 'max:255'],
            'items.*.hours' => ['nullable', 'numeric', 'min:0'],
            'items.*.rate' => ['nullable', 'numeric', 'min:0'],
            'items.*.amount' => ['nullable', 'numeric', 'min:0'],
            'discounts' => ['nullable', 'array'],
            'discounts.*.label' => ['nullable', 'string', 'max:255'],
            'discounts.*.type' => ['nullable', 'in:fixed,percent'],
            'discounts.*.value' => ['nullable', 'numeric', 'gt:0'],
            'discounts.*.target_type' => ['nullable', 'in:invoice,item'],
            'discounts.*.target_item_index' => ['nullable', 'integer', 'min:0'],
        ]);
    }
}
