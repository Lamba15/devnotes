<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Project;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Inertia\Inertia;
use Inertia\Response;

class FinanceController extends Controller
{
    public function transactionsCreate(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);

        return Inertia::render('finance/transactions-create', [
            'projects' => $projects,
            'category_options' => $this->transactionCategoryOptions($request),
        ]);
    }

    public function transactions(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);
        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'project_id' => $this->normalizedFilterValues($request, 'project_id'),
            'category' => $this->normalizedFilterValues($request, 'category'),
            'currency' => $this->normalizedFilterValues($request, 'currency'),
            'direction' => $this->normalizedFilterValues($request, 'direction'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:description,amount,occurred_date,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'project_id' => ['array'],
            'project_id.*' => ['string', 'regex:/^\d+$/'],
            'category' => ['array'],
            'category.*' => ['string', 'max:255'],
            'currency' => ['array'],
            'currency.*' => ['string', 'size:3'],
            'direction' => ['array'],
            'direction.*' => ['string', 'in:income,expense'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'occurred_date';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $projectIdFilter = $this->cleanFilterValues($validated['project_id'] ?? []);
        $categoryFilter = $this->cleanFilterValues($validated['category'] ?? []);
        $currencyFilter = collect($this->cleanFilterValues($validated['currency'] ?? []))
            ->map(fn (string $value) => strtoupper($value))
            ->values()
            ->all();
        $directionFilter = $this->cleanFilterValues($validated['direction'] ?? []);

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
                        ->orWhere('category', 'like', "%{$search}%")
                        ->orWhere('currency', 'like', "%{$search}%")
                        ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%")->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$search}%")));
                });
            })
            ->when($projectIdFilter !== [], fn ($query) => $query->whereIn('project_id', array_map('intval', $projectIdFilter)))
            ->when($categoryFilter !== [], fn ($query) => $query->whereIn('category', $categoryFilter))
            ->when($currencyFilter !== [], fn ($query) => $query->whereIn('currency', $currencyFilter))
            ->when($directionFilter !== [], function ($query) use ($directionFilter): void {
                $query->where(function ($directionQuery) use ($directionFilter): void {
                    if (in_array('income', $directionFilter, true)) {
                        $directionQuery->where('amount', '>', 0);
                    }

                    if (in_array('expense', $directionFilter, true)) {
                        $method = in_array('income', $directionFilter, true) ? 'orWhere' : 'where';
                        $directionQuery->{$method}('amount', '<', 0);
                    }
                });
            })
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('finance/transactions', [
            'projects' => $projects,
            'transactions' => collect($transactions->items())
                ->map(fn (Transaction $transaction) => [
                    'id' => $transaction->id,
                    'description' => $transaction->description,
                    'amount' => (string) $transaction->amount,
                    'currency' => $transaction->currency,
                    'occurred_date' => $transaction->occurred_date?->toDateString(),
                    'created_at' => $transaction->created_at?->toISOString(),
                    'project' => [
                        'id' => $transaction->project?->id,
                        'name' => $transaction->project?->name,
                        'client' => $transaction->project?->client?->only(['id', 'name']),
                    ],
                ])
                ->values()
                ->all(),
            'project_filter_options' => $projects
                ->map(fn (Project $project) => [
                    'label' => $project->client?->name ? "{$project->client->name} / {$project->name}" : $project->name,
                    'value' => (string) $project->id,
                ])
                ->values()
                ->all(),
            'category_filter_options' => Transaction::query()
                ->when(
                    ! $request->user()->isPlatformOwner(),
                    fn ($query) => $query->whereHas(
                        'project',
                        fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
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
            'currency_filter_options' => Transaction::query()
                ->when(
                    ! $request->user()->isPlatformOwner(),
                    fn ($query) => $query->whereHas(
                        'project',
                        fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                    )
                )
                ->whereNotNull('currency')
                ->where('currency', '!=', '')
                ->distinct()
                ->orderBy('currency')
                ->pluck('currency')
                ->map(fn (string $currency) => strtoupper($currency))
                ->unique()
                ->values()
                ->map(fn (string $currency) => ['label' => $currency, 'value' => $currency])
                ->all(),
            'direction_filter_options' => [
                ['label' => 'Income', 'value' => 'income'],
                ['label' => 'Expense', 'value' => 'expense'],
            ],
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
                'project_id' => $projectIdFilter,
                'category' => $categoryFilter,
                'currency' => $currencyFilter,
                'direction' => $directionFilter,
            ],
        ]);
    }

    public function invoices(Request $request): Response
    {
        ['projects' => $projects] = $this->financeScope($request);
        $validated = validator([
            'search' => $request->input('search'),
            'sort_by' => $request->input('sort_by'),
            'sort_direction' => $request->input('sort_direction'),
            'project_id' => $this->normalizedFilterValues($request, 'project_id'),
            'status' => $this->normalizedFilterValues($request, 'status'),
            'currency' => $this->normalizedFilterValues($request, 'currency'),
            'page' => $request->input('page'),
        ], [
            'search' => ['nullable', 'string', 'max:255'],
            'sort_by' => ['nullable', 'in:reference,status,amount,issued_at,due_at,paid_at,created_at'],
            'sort_direction' => ['nullable', 'in:asc,desc'],
            'project_id' => ['array'],
            'project_id.*' => ['string', 'regex:/^\d+$/'],
            'status' => ['array'],
            'status.*' => ['string', 'in:draft,pending,paid,overdue'],
            'currency' => ['array'],
            'currency.*' => ['string', 'size:3'],
            'page' => ['nullable', 'integer', 'min:1'],
        ])->validate();
        $search = trim((string) ($validated['search'] ?? ''));
        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDirection = $validated['sort_direction'] ?? 'desc';
        $projectIdFilter = $this->cleanFilterValues($validated['project_id'] ?? []);
        $statusFilter = $this->expandInvoiceStatuses(
            $this->cleanFilterValues($validated['status'] ?? []),
        );
        $currencyFilter = collect($this->cleanFilterValues($validated['currency'] ?? []))
            ->map(fn (string $value) => strtoupper($value))
            ->values()
            ->all();

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
                        ->orWhere('currency', 'like', "%{$search}%")
                        ->orWhereHas('project', fn ($projectQuery) => $projectQuery->where('name', 'like', "%{$search}%")->orWhereHas('client', fn ($clientQuery) => $clientQuery->where('name', 'like', "%{$search}%")));
                });
            })
            ->when($projectIdFilter !== [], fn ($query) => $query->whereIn('project_id', array_map('intval', $projectIdFilter)))
            ->when($statusFilter !== [], fn ($query) => $query->whereIn('status', $statusFilter))
            ->when($currencyFilter !== [], fn ($query) => $query->whereIn('currency', $currencyFilter))
            ->orderBy($sortBy, $sortDirection)
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('finance/invoices', [
            'projects' => $projects,
            'invoices' => collect($invoices->items())
                ->map(fn (Invoice $invoice) => [
                    'id' => $invoice->id,
                    'reference' => $invoice->reference,
                    'status' => $invoice->status,
                    'amount' => (string) $invoice->amount,
                    'currency' => $invoice->currency,
                    'issued_at' => $invoice->issued_at?->toDateString(),
                    'due_at' => $invoice->due_at?->toDateString(),
                    'paid_at' => $invoice->paid_at?->toDateString(),
                    'project' => [
                        'id' => $invoice->project?->id,
                        'name' => $invoice->project?->name,
                        'client' => $invoice->project?->client?->only(['id', 'name']),
                    ],
                ])
                ->values()
                ->all(),
            'project_filter_options' => $projects
                ->map(fn (Project $project) => [
                    'label' => $project->client?->name ? "{$project->client->name} / {$project->name}" : $project->name,
                    'value' => (string) $project->id,
                ])
                ->values()
                ->all(),
            'status_filter_options' => [
                ['label' => 'Draft', 'value' => 'draft'],
                ['label' => 'Pending', 'value' => 'pending'],
                ['label' => 'Paid', 'value' => 'paid'],
                ['label' => 'Overdue', 'value' => 'overdue'],
            ],
            'currency_filter_options' => Invoice::query()
                ->when(
                    ! $request->user()->isPlatformOwner(),
                    fn ($query) => $query->whereHas(
                        'project',
                        fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                    )
                )
                ->whereNotNull('currency')
                ->where('currency', '!=', '')
                ->distinct()
                ->orderBy('currency')
                ->pluck('currency')
                ->map(fn (string $currency) => strtoupper($currency))
                ->unique()
                ->values()
                ->map(fn (string $currency) => ['label' => $currency, 'value' => $currency])
                ->all(),
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
                'project_id' => $projectIdFilter,
                'status' => array_values(array_intersect(
                    ['draft', 'pending', 'paid', 'overdue'],
                    $this->cleanFilterValues($validated['status'] ?? []),
                )),
                'currency' => $currencyFilter,
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

    private function transactionCategoryOptions(Request $request): array
    {
        return Transaction::query()
            ->when(
                ! $request->user()->isPlatformOwner(),
                fn ($query) => $query->whereHas(
                    'project',
                    fn ($projectQuery) => $request->user()->workspaceAccess()->scopeAccessibleFinanceProjects($projectQuery),
                )
            )
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->map(fn (string $category) => ['label' => $category, 'value' => $category])
            ->values()
            ->all();
    }

    private function normalizedFilterValues(Request $request, string $key): array
    {
        return Arr::wrap($request->input($key));
    }

    private function cleanFilterValues(array $values): array
    {
        return collect($values)
            ->filter(fn ($value) => is_scalar($value))
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function expandInvoiceStatuses(array $statuses): array
    {
        return collect($statuses)
            ->flatMap(function (string $status): array {
                if ($status === 'pending') {
                    return ['pending', 'sent'];
                }

                return [$status];
            })
            ->unique()
            ->values()
            ->all();
    }
}
