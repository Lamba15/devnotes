<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\DeleteInvoice;
use App\Actions\Finance\UpdateInvoice;
use App\Models\Invoice;
use App\Models\Project;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class InvoiceController extends Controller
{
    public function show(Request $request, Invoice $invoice): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        $invoice->load('project.client:id,name');

        return Inertia::render('finance/invoices-show', [
            'invoice' => [
                'id' => $invoice->id,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'amount' => (string) $invoice->amount,
                'currency' => $invoice->currency,
                'issued_at' => $invoice->issued_at?->toDateString(),
                'due_at' => $invoice->due_at?->toDateString(),
                'paid_at' => $invoice->paid_at?->toDateString(),
                'notes' => $invoice->notes,
                'project' => [
                    'id' => $invoice->project->id,
                    'name' => $invoice->project->name,
                    'client' => $invoice->project->client?->only(['id', 'name']),
                ],
            ],
        ]);
    }

    public function edit(Request $request, Invoice $invoice): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        return Inertia::render('finance/invoices-edit', [
            'invoice' => $invoice->only(['id', 'project_id', 'reference', 'status', 'amount', 'currency', 'issued_at', 'due_at', 'paid_at', 'notes']),
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
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'reference' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);

        $createInvoice->handle($request->user(), $project, $validated);

        return to_route('finance.index');
    }

    public function update(Request $request, Invoice $invoice, UpdateInvoice $updateInvoice): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'reference' => ['required', 'string', 'max:255'],
            'status' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'issued_at' => ['nullable', 'date'],
            'due_at' => ['nullable', 'date'],
            'paid_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);
        $updateInvoice->handle($request->user(), $invoice, $project, $validated);

        return to_route('finance.invoices.index');
    }

    public function destroy(Request $request, Invoice $invoice, DeleteInvoice $deleteInvoice): RedirectResponse
    {
        $deleteInvoice->handle($request->user(), $invoice);

        return to_route('finance.invoices.index');
    }

    public function exportPdf(Request $request, Invoice $invoice): HttpResponse
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($invoice->project), 403);

        $invoice->load('project.client');

        $pdf = Pdf::loadView('pdf.invoice', [
            'invoice' => $invoice,
            'ownerName' => $user->isPlatformOwner() ? $user->name : config('app.name'),
        ])->setOption('isRemoteEnabled', true);

        $pdf->setPaper('a4');

        $slug = Str::slug($invoice->reference);
        $filename = 'invoice-'.$slug.'-'.now()->format('Y-m-d').'.pdf';

        return $pdf->download($filename);
    }
}
