<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateTransaction;
use App\Actions\Finance\DeleteTransaction;
use App\Actions\Finance\UpdateTransaction;
use App\Models\Project;
use App\Models\Transaction;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class TransactionController extends Controller
{
    public function show(Request $request, Transaction $transaction): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($transaction->project), 403);

        $transaction->load('project.client:id,name');

        return Inertia::render('finance/transactions-show', [
            'transaction' => [
                'id' => $transaction->id,
                'description' => $transaction->description,
                'amount' => (string) $transaction->amount,
                'currency' => $transaction->currency,
                'occurred_date' => $transaction->occurred_date?->toDateString() ?? $transaction->occurred_date,
                'category' => $transaction->category,
                'created_at' => $transaction->created_at?->toISOString(),
                'pdf_url' => route('finance.transactions.pdf', $transaction),
                'project' => [
                    'id' => $transaction->project->id,
                    'name' => $transaction->project->name,
                    'client' => $transaction->project->client?->only(['id', 'name']),
                ],
            ],
        ]);
    }

    public function edit(Request $request, Transaction $transaction): Response
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($transaction->project), 403);

        return Inertia::render('finance/transactions-edit', [
            'transaction' => [
                'id' => $transaction->id,
                'project_id' => $transaction->project_id,
                'description' => $transaction->description,
                'amount' => (string) $transaction->amount,
                'occurred_date' => $transaction->occurred_date?->toDateString(),
                'category' => $transaction->category,
                'currency' => $transaction->currency,
            ],
            'projects' => $user->workspaceAccess()
                ->scopeAccessibleFinanceProjects(
                    Project::query()->with('client:id,name'),
                )
                ->orderBy('name')
                ->get(),
            'category_options' => Transaction::query()
                ->when(
                    ! $user->isPlatformOwner(),
                    fn ($query) => $query->whereHas(
                        'project',
                        fn ($projectQuery) => $user->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                    )
                )
                ->whereNotNull('category')
                ->where('category', '!=', '')
                ->distinct()
                ->orderBy('category')
                ->pluck('category')
                ->map(fn (string $category) => ['label' => $category, 'value' => $category])
                ->values()
                ->all(),
        ]);
    }

    public function store(Request $request, CreateTransaction $createTransaction): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'occurred_date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);

        $createTransaction->handle($request->user(), $project, $validated);

        return to_route('finance.index');
    }

    public function update(Request $request, Transaction $transaction, UpdateTransaction $updateTransaction): RedirectResponse
    {
        $validated = $request->validate([
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'description' => ['required', 'string', 'max:255'],
            'amount' => ['required', 'numeric'],
            'occurred_date' => ['required', 'date'],
            'category' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'size:3'],
        ]);

        $project = Project::query()->findOrFail($validated['project_id']);
        $updateTransaction->handle($request->user(), $transaction, $project, $validated);

        return to_route('finance.transactions.index');
    }

    public function destroy(Request $request, Transaction $transaction, DeleteTransaction $deleteTransaction): RedirectResponse
    {
        $deleteTransaction->handle($request->user(), $transaction);

        return to_route('finance.transactions.index');
    }

    public function exportPdf(Request $request, Transaction $transaction): HttpResponse
    {
        $user = $request->user();

        abort_unless($user->canManageProjectFinance($transaction->project), 403);

        $transaction->load('project.client');

        $pdf = Pdf::loadView('pdf.transaction', [
            'transaction' => $transaction,
            'ownerName' => $user->isPlatformOwner() ? $user->name : config('app.name'),
        ])->setOption('isRemoteEnabled', true);

        $pdf->setPaper('a4');

        $filename = 'transaction-'.$transaction->id.'-'.now()->format('Y-m-d').'.pdf';

        return response($pdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }
}
