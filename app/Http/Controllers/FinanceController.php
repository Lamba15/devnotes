<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function transactionsCreate(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);

        return Inertia::render('finance/transactions-create', [
            'projects' => $projects,
        ]);
    }

    public function transactions(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:description,amount,occurred_at,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'occurred_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $transactions = Transaction::query()
            ->with('project.client')
            ->when(
                ! $request->user()->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                )
            )
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($transactionQuery) use ($search): void {
                    $transactionQuery->where('description', 'like', "%{$search}%")
                        ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%")->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$search}%")));
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('finance/transactions', [
            'projects' => $projects,
            'transactions' => $transactions->items(),
            'pagination' => [
                'current_page' => $transactions->currentPage(),
                'last_page' => $transactions->lastPage(),
                'per_page' => $transactions->perPage(),
                'total' => $transactions->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function invoices(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:reference,status,amount,issued_at,due_at,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';

        $invoices = Invoice::query()
            ->with('project.client')
            ->when(
                ! $request->user()->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                )
            )
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($invoiceQuery) use ($search): void {
                    $invoiceQuery->where('reference', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%")
                        ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%")->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$search}%")));
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('finance/invoices', [
            'projects' => $projects,
            'invoices' => $invoices->items(),
            'pagination' => [
                'current_page' => $invoices->currentPage(),
                'last_page' => $invoices->lastPage(),
                'per_page' => $invoices->perPage(),
                'total' => $invoices->total(),
            ],
            'filters' => [
                'search' => $search,
                'sort_by' => $sortBy,
                'sort_direction' => $sortDirection,
            ],
        ]);
    }

    public function invoicesCreate(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);

        return Inertia::render('finance/invoices-create', [
            'projects' => $projects,
        ]);
    }

    private function financeScope(Request $request): array
    {
        $user = $request->user();
        $accessibleProjectsQuery = $user->workspaceAccess()->scopeAccessibleFinanceProjects(
            Project::query()->with('client:id,name'),
        );

        abort_if(! $user->isPlatformOwner() && ! (clone $accessibleProjectsQuery)->exists(), 403);

        $projects = $accessibleProjectsQuery
            ->orderBy('name')
            ->get();

        return [
            'projects' => $projects,
        ];
    }
}
