<?php

namespace App\Http\Controllers;

use App\Http\Concerns\BuildsFinanceAnalysis;
use App\Models\AuditLog;
use App\Models\Board;
use App\Models\BoardIssuePlacement;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Issue;
use App\Models\Project;
use App\Models\ProjectStatus;
use App\Models\Transaction;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OverviewController extends Controller
{
    use BuildsFinanceAnalysis;

    public function __invoke(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->isPlatformOwner()) {
            $firstClientId = $user->clientMemberships()->orderBy('id')->value('client_id');

            abort_unless($firstClientId !== null, 403);

            return to_route('clients.show', $firstClientId);
        }

        $thirtyDaysAgo = CarbonImmutable::now()->subDays(30);

        $allTransactions = Transaction::query()
            ->select('id', 'project_id', 'amount', 'currency', 'occurred_date', 'created_at')
            ->orderByRaw('COALESCE(occurred_date, created_at)')
            ->get();

        $allInvoices = Invoice::query()
            ->select('id', 'project_id', 'amount', 'subtotal_amount', 'discount_total_amount', 'status', 'currency', 'issued_at', 'due_at', 'paid_at', 'created_at')
            ->orderByRaw('COALESCE(issued_at, created_at)')
            ->get();

        $financeAnalysis = $this->buildFinanceAnalysis(
            Project::count(),
            $allTransactions,
            $allInvoices,
        );

        return Inertia::render('overview', [
            'stats' => $this->buildKpiStats($thirtyDaysAgo),
            'finance_analysis' => $financeAnalysis,
            'monthly_income' => $this->buildMonthlyIncome($allTransactions),
            'monthly_closed_issues' => $this->buildMonthlyClosedIssues(),
            'issue_distribution' => $this->buildIssueDistribution(),
            'board_summary' => $this->buildBoardSummary(),
            'project_health' => $this->buildProjectHealth(),
            'top_clients' => $this->buildTopClients(),
            'recent_issues' => $this->buildRecentIssues(),
            'recent_activity' => $this->buildRecentActivity(),
        ]);
    }

    private function buildKpiStats(CarbonImmutable $thirtyDaysAgo): array
    {
        return [
            'clients' => [
                'count' => Client::count(),
                'new_this_month' => Client::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'projects' => [
                'count' => Project::count(),
                'new_this_month' => Project::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'issues' => [
                'count' => Issue::count(),
                'new_this_month' => Issue::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'open_issues' => [
                'count' => Issue::where('status', 'todo')->orWhere('status', 'in_progress')->count(),
                'new_this_month' => Issue::where('created_at', '>=', $thirtyDaysAgo)
                    ->where(fn ($q) => $q->where('status', 'todo')->orWhere('status', 'in_progress'))
                    ->count(),
            ],
            'users' => [
                'count' => User::count(),
                'new_this_month' => User::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'boards' => [
                'count' => Board::count(),
                'new_this_month' => Board::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'invoices' => [
                'count' => Invoice::count(),
                'new_this_month' => Invoice::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
            'transactions' => [
                'count' => Transaction::count(),
                'new_this_month' => Transaction::where('created_at', '>=', $thirtyDaysAgo)->count(),
            ],
        ];
    }

    private function buildMonthlyIncome(Collection $transactions): array
    {
        $grouped = $transactions
            ->groupBy(function (Transaction $t) {
                $date = $t->occurred_date ?? $t->created_at;

                return CarbonImmutable::parse($date)->format('Y-m');
            })
            ->map(function (Collection $monthTransactions, string $ym) {
                $date = CarbonImmutable::parse($ym.'-01');

                return [
                    'month' => $ym,
                    'label' => $date->format('M Y'),
                    'income' => round($monthTransactions
                        ->filter(fn (Transaction $t) => (float) $t->amount > 0)
                        ->sum(fn (Transaction $t) => (float) $t->amount), 2),
                    'expense' => round(abs($monthTransactions
                        ->filter(fn (Transaction $t) => (float) $t->amount < 0)
                        ->sum(fn (Transaction $t) => (float) $t->amount)), 2),
                    'net' => round($monthTransactions
                        ->sum(fn (Transaction $t) => (float) $t->amount), 2),
                ];
            })
            ->sortKeys()
            ->values()
            ->all();

        return $grouped;
    }

    private function buildMonthlyClosedIssues(): array
    {
        $driver = Issue::query()->getConnection()->getDriverName();
        $monthExpr = $driver === 'sqlite'
            ? "strftime('%Y-%m', updated_at)"
            : "DATE_FORMAT(updated_at, '%Y-%m')";

        return Issue::query()
            ->where('status', 'done')
            ->selectRaw("{$monthExpr} as month, COUNT(*) as count")
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(fn ($row) => [
                'month' => $row->month,
                'label' => CarbonImmutable::parse($row->month.'-01')->format('M Y'),
                'count' => (int) $row->count,
            ])
            ->all();
    }

    private function buildIssueDistribution(): array
    {
        $byStatus = Issue::query()
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $byPriority = Issue::query()
            ->select('priority', DB::raw('COUNT(*) as count'))
            ->whereNotNull('priority')
            ->groupBy('priority')
            ->pluck('count', 'priority')
            ->all();

        $byType = Issue::query()
            ->select('type', DB::raw('COUNT(*) as count'))
            ->whereNotNull('type')
            ->groupBy('type')
            ->pluck('count', 'type')
            ->all();

        return [
            'by_status' => $byStatus,
            'by_priority' => $byPriority,
            'by_type' => $byType,
            'overdue_count' => Issue::query()
                ->whereNotNull('due_date')
                ->where('due_date', '<', now()->toDateString())
                ->where('status', '!=', 'done')
                ->count(),
            'unassigned_count' => Issue::query()
                ->whereNull('assignee_id')
                ->where('status', '!=', 'done')
                ->count(),
        ];
    }

    private function buildBoardSummary(): array
    {
        $totalBoards = Board::count();
        $placedIssueCount = BoardIssuePlacement::distinct('issue_id')->count('issue_id');

        $openIssueIds = Issue::query()
            ->where('status', '!=', 'done')
            ->pluck('id');

        $placedOpenIssueIds = BoardIssuePlacement::query()
            ->distinct('issue_id')
            ->whereIn('issue_id', $openIssueIds)
            ->pluck('issue_id');

        return [
            'total_boards' => $totalBoards,
            'placed_issues' => $placedIssueCount,
            'backlog_count' => $openIssueIds->diff($placedOpenIssueIds)->count(),
        ];
    }

    private function buildProjectHealth(): array
    {
        $byStatus = ProjectStatus::query()
            ->withCount('projects')
            ->get()
            ->filter(fn (ProjectStatus $status) => $status->projects_count > 0)
            ->map(fn (ProjectStatus $status) => [
                'name' => $status->name,
                'slug' => $status->slug,
                'count' => $status->projects_count,
            ])
            ->values()
            ->all();

        $activeCount = Project::query()
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>', now()))
            ->count();

        $budgetData = Project::query()
            ->whereNotNull('budget')
            ->where('budget', '>', 0)
            ->selectRaw('COUNT(*) as count, SUM(budget) as total')
            ->first();

        $topProjects = Project::query()
            ->withCount('issues')
            ->with('client:id,name')
            ->orderByDesc('issues_count')
            ->limit(5)
            ->get()
            ->map(fn (Project $project) => [
                'id' => $project->id,
                'client_id' => $project->client_id,
                'name' => $project->name,
                'client_name' => $project->client?->name,
                'issues_count' => $project->issues_count,
            ])
            ->all();

        return [
            'by_status' => $byStatus,
            'active_count' => $activeCount,
            'with_budget' => [
                'count' => (int) $budgetData->count,
                'total' => round((float) $budgetData->total, 2),
            ],
            'top_projects' => $topProjects,
        ];
    }

    private function buildTopClients(): array
    {
        return Client::query()
            ->select('clients.id', 'clients.name')
            ->join('projects', 'projects.client_id', '=', 'clients.id')
            ->join('invoices', 'invoices.project_id', '=', 'projects.id')
            ->groupBy('clients.id', 'clients.name')
            ->selectRaw('SUM(invoices.amount) as total_invoiced')
            ->orderByDesc('total_invoiced')
            ->limit(5)
            ->get()
            ->map(fn ($client) => [
                'id' => $client->id,
                'name' => $client->name,
                'total_invoiced' => round((float) $client->total_invoiced, 2),
            ])
            ->all();
    }

    private function buildRecentIssues(): array
    {
        return Issue::query()
            ->with(['project:id,name,client_id', 'project.client:id,name', 'assignee:id,name'])
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (Issue $issue) => [
                'id' => $issue->id,
                'title' => $issue->title,
                'status' => $issue->status,
                'priority' => $issue->priority,
                'type' => $issue->type,
                'due_date' => $issue->due_date?->toDateString(),
                'project_id' => $issue->project_id,
                'client_id' => $issue->project?->client_id,
                'project_name' => $issue->project?->name,
                'client_name' => $issue->project?->client?->name,
                'assignee_name' => $issue->assignee?->name,
                'created_at' => $issue->created_at->toISOString(),
            ])
            ->all();
    }

    private function buildRecentActivity(): array
    {
        return AuditLog::with('user:id,name')
            ->orderByDesc('created_at')
            ->limit(12)
            ->get()
            ->map(fn ($log) => [
                'id' => $log->id,
                'event' => $log->event,
                'source' => $log->source,
                'subject_type' => class_basename($log->subject_type ?? ''),
                'subject_id' => $log->subject_id,
                'user_name' => $log->user?->name ?? 'System',
                'created_at' => $log->created_at->toISOString(),
            ])
            ->all();
    }
}
