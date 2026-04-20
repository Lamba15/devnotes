import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowUpRight,
    BarChart3,
    CheckCircle2,
    Clock,
    CreditCard,
    FolderKanban,
    Inbox,
    LayoutGrid,
    ListChecks,
    Pencil,
    Receipt,
    Scale,
    Ticket,
    TrendingUp,
    UserX,
    Users,
    Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';
import { AlertIndicator } from '@/components/client-dashboard/alert-indicator';
import {
    ClientClosedIssuesChart
    
} from '@/components/client-dashboard/client-closed-issues-chart';
import type {MonthlyClosedIssue} from '@/components/client-dashboard/client-closed-issues-chart';
import { ClientDistributionChart } from '@/components/client-dashboard/client-distribution-chart';
import {
    ClientIncomeHistograph
    
} from '@/components/client-dashboard/client-income-histograph';
import type {MonthlyIncome} from '@/components/client-dashboard/client-income-histograph';
import {
    ClientProjectStatusChart,
    clientProjectStatusClickHandler,
    projectStatusColors,
} from '@/components/client-dashboard/client-project-status-chart';
import {
    ClientTopItemsChart,
    clientVisitTopItem,
} from '@/components/client-dashboard/client-top-items-chart';
import {
    FinanceMetricCard
    
} from '@/components/client-dashboard/finance-metric-card';
import type {MoneySummary} from '@/components/client-dashboard/finance-metric-card';
import { PriorityBadge } from '@/components/client-dashboard/priority-badge';
import {
    StatusDot,
    issueStatusColors,
} from '@/components/client-dashboard/status-dot';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import type { Timeline } from '@/components/finance/finance-trend-chart';
import SecretsCard from '@/components/secrets/secrets-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDateOnly, formatRelativeInstant } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type ClientShape = {
    id: number;
    name: string;
    email: string | null;
    behavior?: { id: number; name: string; slug: string } | null;
    image_path: string | null;
    country_of_origin: string | null;
    industry: string | null;
    address: string | null;
    birthday: string | null;
    date_of_first_interaction: string | null;
    origin: string | null;
    notes: string | null;
    social_links: Array<{ label?: string | null; url?: string | null }>;
    phone_numbers: Array<{ id: number; label?: string | null; number: string }>;
    tags: string[];
};

type KpiStat = { count: number; new_this_month: number };

type DashboardStats = Record<string, KpiStat>;

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
};

type TopProject = {
    id: number;
    client_id: number;
    name: string;
    issues_count: number;
};

type RecentIssue = {
    id: number;
    title: string;
    status: string;
    priority: string | null;
    type: string | null;
    due_date: string | null;
    project_id: number;
    client_id: number;
    project_name: string | null;
    assignee_names: string[];
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

type ShowProps = {
    client: ClientShape;
    summary: {
        members_count: number;
        projects_count: number;
        issues_count: number;
        boards_count: number;
        statuses_count: number;
    };
    dashboard_stats: DashboardStats;
    monthly_income: MonthlyIncome[];
    monthly_closed_issues: MonthlyClosedIssue[];
    issue_distribution: IssueDistribution;
    board_summary: BoardSummary;
    project_health: ProjectHealth;
    top_projects_by_issues: TopProject[];
    finance_analysis: FinanceAnalysis | null;
    recent_issues: RecentIssue[];
    recent_activity: ActivityEntry[];
    recent_projects: Array<{
        id: number;
        name: string;
        status?: { id: number; name: string; slug: string } | null;
    }>;
    recent_members: Array<{
        id: number;
        role: string;
        user: {
            id: number;
            name: string;
            email: string;
            avatar_path?: string | null;
        };
    }>;
    secrets: Array<{
        id: number;
        label: string;
        description: string | null;
        updated_at: string | null;
    }>;
    can_manage_members: boolean;
    can_manage_secrets: boolean;
    can_edit_internal_client_profile: boolean;
    can_view_internal_client_profile: boolean;
    can_access_finance: boolean;
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

const invoiceStatusColors: Record<string, string> = {
    draft: '#94a3b8',
    pending: '#f59e0b',
    paid: '#10b981',
    overdue: '#ef4444',
};

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

type KpiCardConfig = {
    key: string;
    label: string;
    icon: LucideIcon;
    href: string;
    color: string;
    bg: string;
};

function buildKpiCards(clientId: number, canAccessFinance: boolean): KpiCardConfig[] {
    const cards: KpiCardConfig[] = [
        {
            key: 'projects',
            label: 'Projects',
            icon: FolderKanban,
            href: `/clients/${clientId}/projects`,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            key: 'issues',
            label: 'Total Issues',
            icon: Ticket,
            href: `/clients/${clientId}/issues`,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            key: 'open_issues',
            label: 'Open Issues',
            icon: Activity,
            href: `/clients/${clientId}/issues?status%5B%5D=todo&status%5B%5D=in_progress`,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-100 dark:bg-red-900/30',
        },
        {
            key: 'boards',
            label: 'Boards',
            icon: LayoutGrid,
            href: `/clients/${clientId}/boards`,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        },
        {
            key: 'members',
            label: 'Members',
            icon: Users,
            href: `/clients/${clientId}/members`,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
        },
    ];

    if (canAccessFinance) {
        cards.push(
            {
                key: 'invoices',
                label: 'Invoices',
                icon: Receipt,
                href: `/clients/${clientId}/finance`,
                color: 'text-pink-600 dark:text-pink-400',
                bg: 'bg-pink-100 dark:bg-pink-900/30',
            },
            {
                key: 'transactions',
                label: 'Transactions',
                icon: Wallet,
                href: `/clients/${clientId}/finance`,
                color: 'text-teal-600 dark:text-teal-400',
                bg: 'bg-teal-100 dark:bg-teal-900/30',
            },
        );
    }

    return cards;
}

export default function ClientShow({
    client,
    summary,
    dashboard_stats,
    monthly_income,
    monthly_closed_issues,
    issue_distribution,
    board_summary,
    project_health,
    top_projects_by_issues,
    finance_analysis,
    recent_issues,
    recent_activity,
    recent_projects,
    recent_members,
    secrets,
    can_manage_members,
    can_manage_secrets,
    can_edit_internal_client_profile,
    can_view_internal_client_profile,
    can_access_finance,
}: ShowProps) {
    const clientBase = `/clients/${client.id}`;
    const issuesUrl = `${clientBase}/issues`;
    const financeUrl = `${clientBase}/finance`;
    const projectsUrl = `${clientBase}/projects`;
    const boardsUrl = `${clientBase}/boards`;

    const kpiCards = useMemo(
        () => buildKpiCards(client.id, can_access_finance),
        [client.id, can_access_finance],
    );

    const issueStatusSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_status).map(
                ([status, count]) => ({
                    label: formatStatusLabel(status),
                    value: count,
                    color: issueStatusColors[status] ?? '#94a3b8',
                    href: `${issuesUrl}?status%5B%5D=${encodeURIComponent(status)}`,
                }),
            ),
        [issue_distribution.by_status, issuesUrl],
    );

    const issuePrioritySegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_priority).map(
                ([priority, count]) => ({
                    label: formatStatusLabel(priority),
                    value: count,
                    color: issuePriorityColors[priority] ?? '#94a3b8',
                    href: `${issuesUrl}?priority%5B%5D=${encodeURIComponent(priority)}`,
                }),
            ),
        [issue_distribution.by_priority, issuesUrl],
    );

    const issueTypeSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_type).map(([type, count]) => ({
                label: formatStatusLabel(type),
                value: count,
                color: issueTypeColors[type] ?? '#94a3b8',
                href: `${issuesUrl}?type%5B%5D=${encodeURIComponent(type)}`,
            })),
        [issue_distribution.by_type, issuesUrl],
    );

    const activeCurrencyAnalysis = finance_analysis?.by_currency[0] ?? null;
    const hasFinanceData =
        can_access_finance &&
        finance_analysis !== null &&
        finance_analysis.by_currency.length > 0 &&
        activeCurrencyAnalysis !== null;

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
                href: `${financeUrl}?status%5B%5D=${encodeURIComponent(status)}`,
            }));
    }, [activeCurrencyAnalysis, financeUrl]);

    return (
        <>
            <Head title={client.name} />

            <div className="space-y-8">
                {/* Section 1: Quick summary cards (compact) */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        {
                            label: 'Members',
                            value: summary.members_count,
                            icon: Users,
                            color: 'text-blue-600 dark:text-blue-400',
                        },
                        {
                            label: 'Projects',
                            value: summary.projects_count,
                            icon: FolderKanban,
                            color: 'text-violet-600 dark:text-violet-400',
                        },
                        {
                            label: 'Issues',
                            value: summary.issues_count,
                            icon: Ticket,
                            color: 'text-amber-600 dark:text-amber-400',
                        },
                        {
                            label: 'Boards',
                            value: summary.boards_count,
                            icon: LayoutGrid,
                            color: 'text-emerald-600 dark:text-emerald-400',
                        },
                        {
                            label: 'Statuses',
                            value: summary.statuses_count,
                            icon: ListChecks,
                            color: 'text-pink-600 dark:text-pink-400',
                        },
                    ].map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <Card key={stat.label} className="shadow-none">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${stat.color}`}
                                    >
                                        <Icon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">
                                            {stat.label}
                                        </p>
                                        <p className="text-2xl font-semibold">
                                            {stat.value}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Section 2: KPI stat cards with deltas — clickable */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {kpiCards.map((card) => {
                        const Icon = card.icon;
                        const stat = dashboard_stats[card.key];

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
                                            <div className="flex items-baseline gap-2">
                                                <p className="text-2xl font-bold tabular-nums">
                                                    {stat.count}
                                                </p>
                                                {stat.new_this_month > 0 ? (
                                                    <span
                                                        title={`+${stat.new_this_month} this month`}
                                                        className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs text-emerald-600 dark:text-emerald-400"
                                                    >
                                                        <ArrowUpRight className="size-3" />
                                                        +{stat.new_this_month}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>

                {/* Section 3: Monthly Income — only if finance-authorized */}
                {can_access_finance ? (
                    <Card className="shadow-none">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <BarChart3 className="size-5 text-emerald-500" />
                                <CardTitle>Monthly Income</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <ClientIncomeHistograph
                                data={monthly_income}
                                currency={
                                    activeCurrencyAnalysis?.currency ?? null
                                }
                                financeUrl={financeUrl}
                            />
                        </CardContent>
                    </Card>
                ) : null}

                {/* Section 4: Issues Closed per Month */}
                <Card className="shadow-none">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="size-5 text-indigo-500" />
                            <CardTitle>Issues Closed per Month</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ClientClosedIssuesChart
                            data={monthly_closed_issues}
                            issuesUrl={issuesUrl}
                        />
                    </CardContent>
                </Card>

                {/* Section 5: Work Pulse */}
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
                                <ClientDistributionChart
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
                                <ClientDistributionChart
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
                                <ClientDistributionChart
                                    segments={issueTypeSegments}
                                    label="total"
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
                        <div className="space-y-2">
                            <AlertIndicator
                                icon={AlertTriangle}
                                label="Overdue"
                                count={issue_distribution.overdue_count}
                                tone="red"
                                href={`${issuesUrl}?sort_by=due_date&sort_direction=asc`}
                            />
                            <AlertIndicator
                                icon={UserX}
                                label="Unassigned"
                                count={issue_distribution.unassigned_count}
                                tone="amber"
                                href={issuesUrl}
                            />
                            <AlertIndicator
                                icon={Inbox}
                                label="Backlog"
                                count={board_summary.backlog_count}
                                tone="slate"
                                href={boardsUrl}
                            />
                        </div>

                        {recent_issues.length > 0 ? (
                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Recent Issues
                                    </CardTitle>
                                    <Link
                                        href={issuesUrl}
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
                                                href={`${clientBase}/projects/${issue.project_id}/issues/${issue.id}`}
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
                                                        priority={issue.priority}
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

                {/* Section 6: Projects */}
                <div className="space-y-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold">
                        <FolderKanban className="size-5 text-violet-500" />
                        Projects
                    </h2>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Card className="shadow-none">
                            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Projects by Status
                                </CardTitle>
                                <FolderKanban className="size-4 text-violet-500" />
                            </CardHeader>
                            <CardContent>
                                <ClientProjectStatusChart
                                    statuses={project_health.by_status}
                                    onStatusClick={clientProjectStatusClickHandler(
                                        projectsUrl,
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                    Top Projects by Issues
                                </CardTitle>
                                <TrendingUp className="size-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <ClientTopItemsChart
                                    items={top_projects_by_issues.map((p) => ({
                                        id: p.id,
                                        name: p.name,
                                        value: p.issues_count,
                                    }))}
                                    emptyMessage="No projects yet."
                                    valueKind="count"
                                    unitSingular="issue"
                                    unitPlural="issues"
                                    tooltipFooter="Click to open project"
                                    onItemClick={clientVisitTopItem(
                                        (item) =>
                                            `${clientBase}/projects/${item.id}`,
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    {top_projects_by_issues.length > 0 ? (
                        <Card className="shadow-none">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <TrendingUp className="size-4 text-blue-500" />
                                    Most Active Projects
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                                    {top_projects_by_issues.map((project, i) => {
                                        const maxIssues = Math.max(
                                            ...top_projects_by_issues.map(
                                                (p) => p.issues_count,
                                            ),
                                            1,
                                        );
                                        const pct = Math.round(
                                            (project.issues_count / maxIssues) *
                                                100,
                                        );

                                        return (
                                            <Link
                                                key={project.id}
                                                href={`${clientBase}/projects/${project.id}`}
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
                                                            {project.issues_count}
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
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ) : null}
                </div>

                {/* Section 7: Financial Summary */}
                {hasFinanceData && activeCurrencyAnalysis && finance_analysis ? (
                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <Scale className="size-5 text-emerald-500" />
                            Financial Summary
                        </h2>

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <FinanceMetricCard
                                title="Total Received"
                                icon={Wallet}
                                summary={
                                    finance_analysis.overall.transaction_volume
                                }
                                href={financeUrl}
                            />
                            <FinanceMetricCard
                                title="Lifetime Invoiced"
                                icon={CreditCard}
                                summary={
                                    finance_analysis.overall.relationship_volume
                                }
                                href={financeUrl}
                            />
                            <FinanceMetricCard
                                title="Running Account"
                                icon={Scale}
                                summary={finance_analysis.overall.running_account}
                                href={financeUrl}
                            />
                            <Link href={financeUrl}>
                                <Card className="shadow-none transition-all hover:bg-muted/30 hover:shadow-sm">
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
                            </Link>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card className="shadow-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Invoice Status Breakdown
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ClientDistributionChart
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
                                    {['draft', 'pending', 'paid', 'overdue'].map(
                                        (status) => {
                                            const data =
                                                activeCurrencyAnalysis
                                                    .invoice_statuses[status];

                                            if (!data || data.count === 0) {
                                                return null;
                                            }

                                            return (
                                                <Link
                                                    key={status}
                                                    href={`${financeUrl}?status%5B%5D=${encodeURIComponent(status)}`}
                                                    className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-muted/40"
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
                                                </Link>
                                            );
                                        },
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : null}

                {/* Section 8: Profile + Recent members & projects */}
                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-10">
                                    {client.image_path && (
                                        <AvatarImage
                                            src={`/storage/${client.image_path}`}
                                            alt={client.name}
                                        />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                        {client.name
                                            .split(' ')
                                            .map((p) => p[0])
                                            .slice(0, 2)
                                            .join('')
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <CardTitle>
                                    {can_view_internal_client_profile
                                        ? 'Client profile'
                                        : 'Workspace details'}
                                </CardTitle>
                            </div>
                            {can_edit_internal_client_profile ? (
                                <Button asChild size="sm">
                                    <Link href={`/clients/${client.id}/edit`}>
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit client
                                    </Link>
                                </Button>
                            ) : null}
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <ProfileField label="Name" value={client.name} />
                            <ProfileField label="Email" value={client.email} />
                            {can_view_internal_client_profile ? (
                                <>
                                    <ProfileField
                                        label="Behavior"
                                        value={client.behavior?.name ?? null}
                                    />
                                    <ProfileField
                                        label="Industry"
                                        value={client.industry}
                                    />
                                    <ProfileField
                                        label="Country of origin"
                                        value={client.country_of_origin}
                                    />
                                    <ProfileField
                                        label="First met"
                                        value={formatDateOnly(
                                            client.date_of_first_interaction,
                                        )}
                                    />
                                    <ProfileField
                                        label="Birthday"
                                        value={formatDateOnly(client.birthday)}
                                    />
                                    <ProfileField
                                        label="Origin"
                                        value={client.origin}
                                    />
                                    <ProfileField
                                        label="Tags"
                                        value={client.tags.join(', ') || null}
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Phone numbers"
                                        value={
                                            client.phone_numbers
                                                .map((phone) =>
                                                    [phone.label, phone.number]
                                                        .filter(Boolean)
                                                        .join(': '),
                                                )
                                                .join('\n') || null
                                        }
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Social links"
                                        value={
                                            client.social_links
                                                .map((link) =>
                                                    [link.label, link.url]
                                                        .filter(Boolean)
                                                        .join(': '),
                                                )
                                                .join('\n') || null
                                        }
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Address"
                                        value={client.address}
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Notes"
                                        value={client.notes}
                                        fullWidth
                                    />
                                </>
                            ) : (
                                <ProfileField
                                    label="Workspace note"
                                    value="This workspace is scoped for collaboration and project work. Internal relationship notes and owner-side classifications are not exposed here."
                                    fullWidth
                                />
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Recent members</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recent_members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No client members yet.
                                    </p>
                                ) : (
                                    recent_members.map((membership) => {
                                        const avatarSrc = membership.user
                                            .avatar_path
                                            ? `/storage/${membership.user.avatar_path}`
                                            : null;

                                        return (
                                            <div
                                                key={membership.id}
                                                className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                            >
                                                <Avatar className="size-8">
                                                    {avatarSrc && (
                                                        <AvatarImage
                                                            src={avatarSrc}
                                                            alt={
                                                                membership.user
                                                                    .name
                                                            }
                                                        />
                                                    )}
                                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                        {membership.user.name
                                                            .split(' ')
                                                            .map(
                                                                (p: string) =>
                                                                    p[0],
                                                            )
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    {can_manage_members ? (
                                                        <Link
                                                            href={`/clients/${client.id}/members/${membership.id}`}
                                                            className="font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {
                                                                membership.user
                                                                    .name
                                                            }
                                                        </Link>
                                                    ) : (
                                                        <p className="font-medium">
                                                            {
                                                                membership.user
                                                                    .name
                                                            }
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">
                                                        {membership.user.email}{' '}
                                                        ·{' '}
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] capitalize"
                                                        >
                                                            {membership.role}
                                                        </Badge>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <Link
                                    href={`/clients/${client.id}/members`}
                                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Open members
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Recent projects</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recent_projects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No projects yet.
                                    </p>
                                ) : (
                                    recent_projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="rounded-lg border px-3 py-2"
                                        >
                                            <Link
                                                href={`/clients/${client.id}/projects/${project.id}`}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {project.name}
                                            </Link>
                                            <p className="text-sm text-muted-foreground">
                                                {project.status?.name ??
                                                    'No status'}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <Link
                                    href={`/clients/${client.id}/projects`}
                                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Open projects
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Section 9: Recent Activity */}
                <Card className="shadow-none">
                    <CardHeader className="flex-row items-center justify-between space-y-0">
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="size-5 text-muted-foreground" />
                            Recent Activity
                        </CardTitle>
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
                                                { fallback: 'unknown' },
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {can_manage_secrets ? (
                    <SecretsCard
                        title="Secrets"
                        description="Platform-only credentials and private values for this client."
                        secrets={secrets}
                        createHref={`/clients/${client.id}/secrets/create`}
                        editHref={(secretId) =>
                            `/clients/${client.id}/secrets/${secretId}/edit`
                        }
                        deleteHref={(secretId) =>
                            `/clients/${client.id}/secrets/${secretId}`
                        }
                        revealHref={(secretId) =>
                            `/clients/${client.id}/secrets/${secretId}/reveal`
                        }
                    />
                ) : null}
            </div>
        </>
    );
}

function ProfileField({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value: string | null;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">
                {value || '—'}
            </p>
        </div>
    );
}

ClientShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
