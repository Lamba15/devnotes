<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateTransaction;
use App\Actions\Finance\DeleteTransaction;
use App\Actions\Finance\UpdateTransaction;
use App\Models\Project;
use App\Models\Transaction;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

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
}
