import { Head, Link, router } from '@inertiajs/react';
import {
    BarController,
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    LinearScale,
    Tooltip as ChartTooltip,
} from 'chart.js';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    BriefcaseBusiness,
    CheckCircle2,
    Clock,
    CreditCard,
    FolderKanban,
    Inbox,
    LayoutGrid,
    Receipt,
    Scale,
    Ticket,
    TrendingUp,
    Trophy,
    UserX,
    Users,
    Wallet,
} from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { CrudPage } from '@/components/crud/crud-page';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import type { Timeline } from '@/components/finance/finance-trend-chart';
import { ClosedIssuesChart } from '@/components/overview/closed-issues-chart';
import type { MonthlyClosedIssue } from '@/components/overview/closed-issues-chart';
import { DistributionChart } from '@/components/overview/distribution-chart';
import { IncomeHistograph } from '@/components/overview/income-histograph';
import type { MonthlyIncome } from '@/components/overview/income-histograph';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatRelativeInstant } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';
import { cn } from '@/lib/utils';

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

type MoneySummary = {
    amount: number;
    currency: string | null;
    mixed_currencies: boolean;
};

type CurrencyAnalysis = {
    currency: string | null;
    label: string;
    running_account: number;
    client_owes_you: number;
    you_owe_client: number;
    transaction_total: number;
    invoice_total: number;
    received_total: number;
    refund_total: number;
    open_invoice_total: number;
    invoice_statuses: Record<string, { count: number; amount: number }>;
    timeline: Timeline;
};

type FinanceAnalysis = {
    overall: {
        project_count: number;
        transaction_count: number;
        invoice_count: number;
        currencies: string[];
        running_account: MoneySummary;
        relationship_volume: MoneySummary;
        transaction_volume: MoneySummary;
    };
    by_currency: CurrencyAnalysis[];
};

type KpiStat = {
    count: number;
    new_this_month: number;
};

type Stats = Record<string, KpiStat>;

type IssueDistribution = {
    by_status: Record<string, number>;
    by_priority: Record<string, number>;
    by_type: Record<string, number>;
    overdue_count: number;
    unassigned_count: number;
};

type BoardSummary = {
    total_boards: number;
    placed_issues: number;
    backlog_count: number;
};

type ProjectHealth = {
    by_status: { name: string; slug: string; count: number }[];
    active_count: number;
    with_budget: { count: number; total: number };
    top_projects: {
        id: number;
        client_id: number | null;
        name: string;
        client_name: string | null;
        issues_count: number;
    }[];
};

type TopClient = {
    id: number;
    name: string;
    total_invoiced: number;
};

type RecentIssue = {
    id: number;
    title: string;
    status: string;
    priority: string | null;
    type: string | null;
    due_date: string | null;
    project_id: number;
    client_id: number | null;
    project_name: string | null;
    client_name: string | null;
    assignee_name: string | null;
    created_at: string;
};

type ActivityEntry = {
    id: number;
    event: string;
    source: string;
    subject_type: string;
    subject_id: number | null;
    user_name: string;
    created_at: string;
};

type OverviewProps = {
    stats: Stats;
    finance_analysis: FinanceAnalysis;
    monthly_income: MonthlyIncome[];
    monthly_closed_issues: MonthlyClosedIssue[];
    issue_distribution: IssueDistribution;
    board_summary: BoardSummary;
    project_health: ProjectHealth;
    top_clients: TopClient[];
    recent_issues: RecentIssue[];
    recent_activity: ActivityEntry[];
};

const statCards = [
    {
        key: 'clients',
        label: 'Clients',
        icon: BriefcaseBusiness,
        href: '/clients',
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-100 dark:bg-violet-900/30',
    },
    {
        key: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        href: '/clients',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
        key: 'issues',
        label: 'Total Issues',
        icon: Ticket,
        href: '/tracking/issues',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
        key: 'open_issues',
        label: 'Open Issues',
        icon: Activity,
        href: '/tracking/issues',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-100 dark:bg-red-900/30',
    },
    {
        key: 'users',
        label: 'Users',
        icon: Users,
        href: '/clients',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
        key: 'boards',
        label: 'Boards',
        icon: LayoutGrid,
        href: '/tracking/boards',
        color: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
        key: 'invoices',
        label: 'Invoices',
        icon: Receipt,
        href: '/finance/invoices',
        color: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-100 dark:bg-pink-900/30',
    },
    {
        key: 'transactions',
        label: 'Transactions',
        icon: Wallet,
        href: '/finance/transactions',
        color: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-100 dark:bg-teal-900/30',
    },
] as const;

const issueStatusColors: Record<string, string> = {
    todo: '#f59e0b',
    in_progress: '#3b82f6',
    done: '#10b981',
};

const issuePriorityColors: Record<string, string> = {
    low: '#94a3b8',
    medium: '#f59e0b',
    high: '#ef4444',
};

const issueTypeColors: Record<string, string> = {
    task: '#3b82f6',
    bug: '#ef4444',
    feature: '#8b5cf6',
};

const projectStatusColors = [
    '#8b5cf6',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
];

const invoiceStatusColors: Record<string, string> = {
    draft: '#94a3b8',
    pending: '#f59e0b',
    paid: '#10b981',
    overdue: '#ef4444',
};

const clientBarColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'];

const projectCardGradients = [
    'from-violet-500/10 to-violet-500/5 border-violet-200/60 dark:border-violet-800/40',
    'from-blue-500/10 to-blue-500/5 border-blue-200/60 dark:border-blue-800/40',
    'from-emerald-500/10 to-emerald-500/5 border-emerald-200/60 dark:border-emerald-800/40',
    'from-amber-500/10 to-amber-500/5 border-amber-200/60 dark:border-amber-800/40',
    'from-pink-500/10 to-pink-500/5 border-pink-200/60 dark:border-pink-800/40',
];

const projectCountColors = [
    'text-violet-600 dark:text-violet-400',
    'text-blue-600 dark:text-blue-400',
    'text-emerald-600 dark:text-emerald-400',
    'text-amber-600 dark:text-amber-400',
    'text-pink-600 dark:text-pink-400',
];

function formatStatusLabel(status: string): string {
    return status
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

export default function Overview({
    stats,
    finance_analysis,
    monthly_income,
    monthly_closed_issues,
    issue_distribution,
    board_summary,
    project_health,
    top_clients,
    recent_issues,
    recent_activity,
}: OverviewProps) {
    const activeCurrencyAnalysis = finance_analysis.by_currency[0];

    const issueStatusSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_status).map(
                ([status, count]) => ({
                    label: formatStatusLabel(status),
                    value: count,
                    color: issueStatusColors[status] ?? '#94a3b8',
                }),
            ),
        [issue_distribution.by_status],
    );

    const issuePrioritySegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_priority).map(
                ([priority, count]) => ({
                    label: formatStatusLabel(priority),
                    value: count,
                    color: issuePriorityColors[priority] ?? '#94a3b8',
                }),
            ),
        [issue_distribution.by_priority],
    );

    const issueTypeSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_type).map(([type, count]) => ({
                label: formatStatusLabel(type),
                value: count,
                color: issueTypeColors[type] ?? '#94a3b8',
            })),
        [issue_distribution.by_type],
    );

    const invoiceStatusSegments = useMemo(() => {
        if (!activeCurrencyAnalysis) {
            return [];
        }

        return Object.entries(activeCurrencyAnalysis.invoice_statuses)
            .filter(([, data]) => data.count > 0)
            .map(([status, data]) => ({
                label: formatStatusLabel(status),
                value: data.count,
                color: invoiceStatusColors[status] ?? '#94a3b8',
            }));
    }, [activeCurrencyAnalysis]);

    const hasFinanceData =
        finance_analysis.by_currency.length > 0 && activeCurrencyAnalysis;

    return (
        <>
            <Head title="Overview" />

            <CrudPage
                title="Overview"
                description="Your platform command center"
            >
                <div className="space-y-8">
                    {/* Section 1: KPI Stat Cards — ABOVE the graph */}
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            const stat = stats[card.key];

                            if (!stat) {
                                return null;
                            }

                            return (
                                <Link key={card.key} href={card.href}>
                                    <Card className="shadow-none transition-all hover:bg-muted/30 hover:shadow-sm">
                                        <CardContent className="flex items-center gap-4 p-4">
                                            <div
                                                className={cn(
                                                    'flex size-11 shrink-0 items-center justify-center rounded-xl',
                                                    card.bg,
                                                    card.color,
                                                )}
                                            >
                                                <Icon className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                                    {card.label}
                                                </p>
                                                <p className="text-2xl font-bold tabular-nums">
                                                    {stat.count}
                                                </p>
                                                {stat.new_this_month > 0 ? (
                                                    <p className="flex items-center gap-0.5 text-xs text-emerald-600 dark:text-emerald-400">
                                                        <ArrowUpRight className="size-3" />
                                                        +{stat.new_this_month}{' '}
                                                        this month
                                                    </p>
                                                ) : null}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Section 2: Monthly Income Histograph */}
                    <Card className="shadow-none">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart3 className="size-5 text-emerald-500" />
                                <CardTitle>Monthly Income</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <IncomeHistograph
                                data={monthly_income}
                                currency={
                                    activeCurrencyAnalysis?.currency ?? null
                                }
                            />
                        </CardContent>
                    </Card>

                    {/* Section 3: Closed Issues per Month */}
                    <Card className="shadow-none">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="size-5 text-indigo-500" />
                                <CardTitle>Issues Closed per Month</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ClosedIssuesChart data={monthly_closed_issues} />
                        </CardContent>
                    </Card>

                    {/* Section 4: Work Pulse — Issues & Boards */}
                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <Activity className="size-5 text-blue-500" />
                            Work Pulse
                        </h2>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Issues by Status
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DistributionChart
                                        segments={issueStatusSegments}
                                        label="total"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Issues by Priority
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DistributionChart
                                        segments={issuePrioritySegments}
                                        label="total"
                                    />
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Issues by Type
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DistributionChart
                                        segments={issueTypeSegments}
                                        label="total"
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Alerts + Recent Issues — side by side */}
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                            {/* Alerts column — compact, adapts to content */}
                            <div className="space-y-2">
                                <AlertIndicator
                                    icon={AlertTriangle}
                                    label="Overdue"
                                    count={issue_distribution.overdue_count}
                                    tone="red"
                                    href="/tracking/issues"
                                />
                                <AlertIndicator
                                    icon={UserX}
                                    label="Unassigned"
                                    count={issue_distribution.unassigned_count}
                                    tone="amber"
                                    href="/tracking/issues"
                                />
                                <AlertIndicator
                                    icon={Inbox}
                                    label="Backlog"
                                    count={board_summary.backlog_count}
                                    tone="slate"
                                    href="/tracking/boards"
                                />
                            </div>

                            {/* Recent Issues — compact list */}
                            {recent_issues.length > 0 ? (
                                <Card className="shadow-none">
                                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Recent Issues
                                        </CardTitle>
                                        <Link
                                            href="/tracking/issues"
                                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            View all
                                        </Link>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-1">
                                            {recent_issues.map((issue) => (
                                                <Link
                                                    key={issue.id}
                                                    href={
                                                        issue.client_id
                                                            ? `/clients/${issue.client_id}/projects/${issue.project_id}/issues/${issue.id}`
                                                            : '#'
                                                    }
                                                    className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/30"
                                                >
                                                    <StatusDot
                                                        status={issue.status}
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-sm">
                                                        {issue.title}
                                                    </span>
                                                    <span className="shrink-0 truncate text-xs text-muted-foreground">
                                                        {issue.project_name}
                                                    </span>
                                                    {issue.priority ? (
                                                        <PriorityBadge
                                                            priority={
                                                                issue.priority
                                                            }
                                                        />
                                                    ) : null}
                                                </Link>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : null}
                        </div>
                    </div>

                    {/* Section 5: Projects & Clients */}
                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <FolderKanban className="size-5 text-violet-500" />
                            Projects & Clients
                        </h2>

                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Projects by Status — Horizontal Bar Chart */}
                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Projects by Status
                                    </CardTitle>
                                    <FolderKanban className="size-4 text-violet-500" />
                                </CardHeader>
                                <CardContent>
                                    <ProjectStatusChart
                                        statuses={project_health.by_status}
                                    />
                                </CardContent>
                            </Card>

                            {/* Top Clients — Horizontal Bar Chart */}
                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Top Clients by Revenue
                                    </CardTitle>
                                    <Trophy className="size-4 text-amber-500" />
                                </CardHeader>
                                <CardContent>
                                    <TopClientsChart
                                        clients={top_clients}
                                        currency={
                                            activeCurrencyAnalysis?.currency ??
                                            null
                                        }
                                    />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Most Active Projects — Colorful cards */}
                        {project_health.top_projects.length > 0 ? (
                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0">
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <TrendingUp className="size-4 text-blue-500" />
                                        Most Active Projects
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                        {project_health.top_projects.map(
                                            (project, i) => {
                                                const maxIssues = Math.max(
                                                    ...project_health.top_projects.map(
                                                        (p) => p.issues_count,
                                                    ),
                                                    1,
                                                );
                                                const pct = Math.round(
                                                    (project.issues_count /
                                                        maxIssues) *
                                                        100,
                                                );

                                                return (
                                                    <Link
                                                        key={project.id}
                                                        href={
                                                            project.client_id
                                                                ? `/clients/${project.client_id}/projects/${project.id}`
                                                                : '#'
                                                        }
                                                        className={cn(
                                                            'group rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-md',
                                                            projectCardGradients[
                                                                i %
                                                                    projectCardGradients.length
                                                            ],
                                                        )}
                                                    >
                                                        <p className="truncate text-sm font-semibold group-hover:underline">
                                                            {project.name}
                                                        </p>
                                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                            {project.client_name ??
                                                                'No client'}
                                                        </p>
                                                        <div className="mt-3 space-y-1.5">
                                                            <div className="flex items-end justify-between">
                                                                <span
                                                                    className={cn(
                                                                        'text-2xl font-bold tabular-nums',
                                                                        projectCountColors[
                                                                            i %
                                                                                projectCountColors.length
                                                                        ],
                                                                    )}
                                                                >
                                                                    {
                                                                        project.issues_count
                                                                    }
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    issues
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                                                                <div
                                                                    className="h-full rounded-full transition-all"
                                                                    style={{
                                                                        width: `${pct}%`,
                                                                        backgroundColor:
                                                                            projectStatusColors[
                                                                                i %
                                                                                    projectStatusColors.length
                                                                            ],
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </Link>
                                                );
                                            },
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ) : null}
                    </div>

                    {/* Section 6: Financial Summary */}
                    {hasFinanceData ? (
                        <div className="space-y-4">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <Scale className="size-5 text-emerald-500" />
                                Financial Summary
                            </h2>

                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                <FinanceMetricCard
                                    title="Total Revenue"
                                    icon={Wallet}
                                    summary={
                                        finance_analysis.overall
                                            .transaction_volume
                                    }
                                />
                                <FinanceMetricCard
                                    title="Lifetime Invoiced"
                                    icon={CreditCard}
                                    summary={
                                        finance_analysis.overall
                                            .relationship_volume
                                    }
                                />
                                <FinanceMetricCard
                                    title="Running Account"
                                    icon={Scale}
                                    summary={
                                        finance_analysis.overall.running_account
                                    }
                                />
                                <Card className="shadow-none">
                                    <CardContent className="space-y-3 pt-6">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Receipt className="size-4" />
                                            <span className="text-sm font-medium">
                                                Open Invoices
                                            </span>
                                        </div>
                                        <FinanceAmount
                                            amount={
                                                activeCurrencyAnalysis.open_invoice_total
                                            }
                                            currency={
                                                activeCurrencyAnalysis.currency
                                            }
                                            className="text-xl"
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-2">
                                <Card className="shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Invoice Status Breakdown
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <DistributionChart
                                            segments={invoiceStatusSegments}
                                            label="total"
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Invoice Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            'draft',
                                            'pending',
                                            'paid',
                                            'overdue',
                                        ].map((status) => {
                                            const data =
                                                activeCurrencyAnalysis
                                                    .invoice_statuses[status];

                                            if (!data || data.count === 0) {
                                                return null;
                                            }

                                            return (
                                                <div
                                                    key={status}
                                                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 p-3"
                                                >
                                                    <div className="space-y-1">
                                                        <FinanceStatusBadge
                                                            status={status}
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            {data.count} invoice
                                                            {data.count === 1
                                                                ? ''
                                                                : 's'}
                                                        </p>
                                                    </div>
                                                    <FinanceAmount
                                                        amount={data.amount}
                                                        currency={
                                                            activeCurrencyAnalysis.currency
                                                        }
                                                    />
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : null}

                    {/* Section 7: Recent Activity */}
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="size-5 text-muted-foreground" />
                                Recent Activity
                            </CardTitle>
                            <Link
                                href="/audit-logs"
                                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                                View all
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {recent_activity.length === 0 ? (
                                <p className="py-8 text-center text-sm text-muted-foreground">
                                    No recent activity yet.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {recent_activity.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                        >
                                            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                                                <Activity className="size-3.5 text-muted-foreground" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm">
                                                    <span className="font-medium">
                                                        {entry.user_name}
                                                    </span>{' '}
                                                    <span className="text-muted-foreground">
                                                        {entry.event}
                                                    </span>{' '}
                                                    {entry.subject_type && (
                                                        <span className="font-medium">
                                                            {entry.subject_type}
                                                            {entry.subject_id
                                                                ? ` #${entry.subject_id}`
                                                                : ''}
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="size-3" />
                                                {formatRelativeInstant(
                                                    entry.created_at,
                                                    {
                                                        fallback: 'unknown',
                                                    },
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </CrudPage>
        </>
    );
}

/* ---- Project Status Horizontal Bar Chart ---- */

function ProjectStatusChart({
    statuses,
}: {
    statuses: { name: string; slug: string; count: number }[];
}) {
    const chartRef = useRef<ChartJS<'bar'>>(null);

    const handleClick = useCallback(
        (event: unknown) => {
            const chart = chartRef.current;

            if (!chart) {
                return;
            }

            const points = chart.getElementsAtEventForMode(
                event as Event,
                'nearest',
                { intersect: true },
                false,
            );

            if (points.length > 0) {
                const idx = points[0].index;
                const status = statuses[idx];

                if (status) {
                    router.get('/clients/projects', {
                        'status[]': status.slug,
                    });
                }
            }
        },
        [statuses],
    );

    const chartData = useMemo(
        () => ({
            labels: statuses.map((s) => s.name),
            datasets: [
                {
                    data: statuses.map((s) => s.count),
                    backgroundColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[
                                i % projectStatusColors.length
                            ] + 'bb',
                    ),
                    borderColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[i % projectStatusColors.length],
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: statuses.map(
                        (_, i) =>
                            projectStatusColors[i % projectStatusColors.length],
                    ),
                    barThickness: 28,
                },
            ],
        }),
        [statuses],
    );

    const chartOptions = useMemo(
        () => ({
            indexAxis: 'y' as const,
            responsive: true,
            maintainAspectRatio: false,
            onClick: handleClick,
            onHover: (event: unknown) => {
                const chart = chartRef.current;

                if (!chart) {
                    return;
                }

                const points = chart.getElementsAtEventForMode(
                    event as Event,
                    'nearest',
                    { intersect: true },
                    false,
                );

                chart.canvas.style.cursor =
                    points.length > 0 ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    grid: { color: 'rgba(160, 160, 160, 0.1)' },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 10 },
                        stepSize: 1,
                    },
                    border: { display: false },
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(200, 200, 200, 0.9)',
                        font: { size: 12, weight: 'bold' as const },
                    },
                    border: { display: false },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: 'rgba(160, 160, 160, 0.9)',
                    bodyColor: '#e4e4e7',
                    borderColor: 'rgba(63, 63, 70, 0.6)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    bodyFont: { size: 13, weight: 'bold' as const },
                    callbacks: {
                        label: (ctx: { parsed: { x: number | null } }) => {
                            const val = ctx.parsed.x ?? 0;

                            return `${val} project${val === 1 ? '' : 's'}`;
                        },
                        footer: () => 'Click to filter projects',
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [handleClick],
    );

    if (statuses.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                No projects yet.
            </p>
        );
    }

    return (
        <div
            className="rounded-xl border border-border/60 bg-background/70 p-4"
            style={{
                height: Math.max(statuses.length * 50 + 40, 180),
            }}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

/* ---- Top Clients Horizontal Bar Chart ---- */

function TopClientsChart({
    clients,
    currency,
}: {
    clients: TopClient[];
    currency: string | null;
}) {
    const chartRef = useRef<ChartJS<'bar'>>(null);

    const handleClick = useCallback(
        (event: unknown) => {
            const chart = chartRef.current;

            if (!chart) {
                return;
            }

            const points = chart.getElementsAtEventForMode(
                event as Event,
                'nearest',
                { intersect: true },
                false,
            );

            if (points.length > 0) {
                const idx = points[0].index;
                const client = clients[idx];

                if (client) {
                    router.visit(`/clients/${client.id}`);
                }
            }
        },
        [clients],
    );

    const chartData = useMemo(
        () => ({
            labels: clients.map((c) => c.name),
            datasets: [
                {
                    data: clients.map((c) => c.total_invoiced),
                    backgroundColor: clients.map(
                        (_, i) =>
                            clientBarColors[i % clientBarColors.length] + 'bb',
                    ),
                    borderColor: clients.map(
                        (_, i) => clientBarColors[i % clientBarColors.length],
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: clients.map(
                        (_, i) => clientBarColors[i % clientBarColors.length],
                    ),
                    barThickness: 28,
                },
            ],
        }),
        [clients],
    );

    const chartOptions = useMemo(
        () => ({
            indexAxis: 'y' as const,
            responsive: true,
            maintainAspectRatio: false,
            onClick: handleClick,
            onHover: (event: unknown) => {
                const chart = chartRef.current;

                if (!chart) {
                    return;
                }

                const points = chart.getElementsAtEventForMode(
                    event as Event,
                    'nearest',
                    { intersect: true },
                    false,
                );

                chart.canvas.style.cursor =
                    points.length > 0 ? 'pointer' : 'default';
            },
            scales: {
                x: {
                    grid: { color: 'rgba(160, 160, 160, 0.1)' },
                    ticks: {
                        color: 'rgba(160, 160, 160, 0.7)',
                        font: { size: 10 },
                        callback: (value: string | number) =>
                            formatCurrencyAmount(Number(value), currency),
                    },
                    border: { display: false },
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: 'rgba(200, 200, 200, 0.9)',
                        font: { size: 12, weight: 'bold' as const },
                    },
                    border: { display: false },
                },
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(24, 24, 27, 0.95)',
                    titleColor: 'rgba(160, 160, 160, 0.9)',
                    bodyColor: '#e4e4e7',
                    borderColor: 'rgba(63, 63, 70, 0.6)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    bodyFont: { size: 13, weight: 'bold' as const },
                    callbacks: {
                        label: (ctx: { parsed: { x: number | null } }) =>
                            `Revenue: ${formatCurrencyAmount(ctx.parsed.x ?? 0, currency)}`,
                        footer: () => 'Click to view client',
                    },
                },
            },
            animation: {
                duration: 800,
                easing: 'easeInOutCubic' as const,
            },
        }),
        [handleClick, currency],
    );

    if (clients.length === 0) {
        return (
            <p className="py-6 text-center text-sm text-muted-foreground">
                No invoiced clients yet.
            </p>
        );
    }

    return (
        <div
            className="rounded-xl border border-border/60 bg-background/70 p-4"
            style={{ height: Math.max(clients.length * 50 + 40, 180) }}
        >
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

/* ---- Helper Components ---- */

function FinanceMetricCard({
    title,
    icon: Icon,
    summary,
}: {
    title: string;
    icon: typeof Wallet;
    summary: MoneySummary;
}) {
    return (
        <Card className="shadow-none">
            <CardContent className="space-y-3 pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="size-4" />
                    <span className="text-sm font-medium">{title}</span>
                </div>
                {summary.mixed_currencies ? (
                    <p className="text-sm leading-6 text-muted-foreground">
                        Mixed currencies
                    </p>
                ) : (
                    <FinanceAmount
                        amount={summary.amount}
                        currency={summary.currency}
                        className="text-xl"
                    />
                )}
            </CardContent>
        </Card>
    );
}

function AlertIndicator({
    icon: Icon,
    label,
    count,
    tone,
    href,
}: {
    icon: typeof AlertTriangle;
    label: string;
    count: number;
    tone: 'red' | 'amber' | 'slate';
    href: string;
}) {
    const active = count > 0;

    const bg = {
        red: active
            ? 'border-red-200/70 bg-red-50/50 dark:border-red-900/40 dark:bg-red-950/20'
            : 'border-border/40 bg-muted/10',
        amber: active
            ? 'border-amber-200/70 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
            : 'border-border/40 bg-muted/10',
        slate: 'border-border/40 bg-muted/10',
    };

    const iconColor = {
        red: active
            ? 'text-red-600 dark:text-red-400'
            : 'text-muted-foreground/50',
        amber: active
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground/50',
        slate: 'text-muted-foreground/50',
    };

    const countColor = {
        red: active
            ? 'text-red-700 dark:text-red-300'
            : 'text-muted-foreground/60',
        amber: active
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-muted-foreground/60',
        slate: active ? 'text-foreground' : 'text-muted-foreground/60',
    };

    return (
        <Link
            href={href}
            className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/30',
                bg[tone],
            )}
        >
            <Icon className={cn('size-4 shrink-0', iconColor[tone])} />
            <span
                className={cn(
                    'text-sm',
                    active ? 'text-foreground' : 'text-muted-foreground/60',
                )}
            >
                {label}
            </span>
            <span
                className={cn(
                    'ml-auto text-lg font-bold tabular-nums',
                    countColor[tone],
                )}
            >
                {count}
            </span>
        </Link>
    );
}

function StatusDot({ status }: { status: string }) {
    const color = issueStatusColors[status] ?? '#94a3b8';

    return (
        <span
            className="block size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
        />
    );
}

function PriorityBadge({ priority }: { priority: string }) {
    const toneClasses: Record<string, string> = {
        low: 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400',
        medium: 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300',
        high: 'border-red-200 bg-red-100 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300',
    };

    return (
        <span
            className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize',
                toneClasses[priority] ?? toneClasses.low,
            )}
        >
            {priority}
        </span>
    );
}

Overview.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
