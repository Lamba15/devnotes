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
    CheckCircle2,
    Clock,
    CreditCard,
    FolderKanban,
    Inbox,
    LayoutGrid,
    Pencil,
    Receipt,
    Scale,
    Ticket,
    TrendingUp,
    UserX,
    Users,
    Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useRef } from 'react';
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
import SecretsCard from '@/components/secrets/secrets-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDateOnly, formatRelativeInstant } from '@/lib/datetime';
import { cn } from '@/lib/utils';

ChartJS.register(
    BarController,
    BarElement,
    CategoryScale,
    LinearScale,
    ChartTooltip,
);

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
    assignee_names: string[];
    created_at: string;
};

type RecentInvoice = {
    id: number;
    project_id: number;
    reference: string;
    status: string;
    amount: number;
    currency: string | null;
    issued_at: string | null;
    created_at: string | null;
};

type RecentTransaction = {
    id: number;
    project_id: number;
    description: string;
    amount: number;
    currency: string | null;
    occurred_date: string | null;
    created_at: string | null;
};

type ActivityEntry = {
    id: number;
    event: string;
    source: string;
    subject_type: string;
    subject_id: number | null;
    user_name: string;
    created_at: string | null;
};

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

function formatStatusLabel(value: string): string {
    return value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export default function ClientShow({
    client,
    summary,
    stats,
    finance_analysis,
    monthly_income,
    monthly_closed_issues,
    issue_distribution,
    board_summary,
    project_health,
    recent_projects,
    recent_members,
    recent_issues,
    recent_invoices,
    recent_transactions,
    recent_activity,
    secrets,
    can_manage_members,
    can_manage_secrets,
    can_edit_internal_client_profile,
    can_view_internal_client_profile,
    can_view_members,
    can_view_finance,
}: {
    client: ClientShape;
    summary: {
        members_count: number;
        projects_count: number;
        issues_count: number;
        boards_count: number;
        statuses_count: number;
    };
    stats: Stats;
    finance_analysis: FinanceAnalysis;
    monthly_income: MonthlyIncome[];
    monthly_closed_issues: MonthlyClosedIssue[];
    issue_distribution: IssueDistribution;
    board_summary: BoardSummary;
    project_health: ProjectHealth;
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
    recent_issues: RecentIssue[];
    recent_invoices: RecentInvoice[];
    recent_transactions: RecentTransaction[];
    recent_activity: ActivityEntry[];
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
    can_view_members: boolean;
    can_view_finance: boolean;
}) {
    const activeCurrencyAnalysis = finance_analysis.by_currency[0];
    const issueStatusSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_status).map(
                ([status, count]) => ({
                    label: formatStatusLabel(status),
                    value: count,
                    color: issueStatusColors[status] ?? '#94a3b8',
                    href: `/clients/${client.id}/issues?status%5B%5D=${encodeURIComponent(status)}`,
                }),
            ),
        [client.id, issue_distribution.by_status],
    );
    const issuePrioritySegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_priority).map(
                ([priority, count]) => ({
                    label: formatStatusLabel(priority),
                    value: count,
                    color: issuePriorityColors[priority] ?? '#94a3b8',
                    href: `/clients/${client.id}/issues?priority%5B%5D=${encodeURIComponent(priority)}`,
                }),
            ),
        [client.id, issue_distribution.by_priority],
    );
    const issueTypeSegments = useMemo(
        () =>
            Object.entries(issue_distribution.by_type).map(([type, count]) => ({
                label: formatStatusLabel(type),
                value: count,
                color: issueTypeColors[type] ?? '#94a3b8',
                href: `/clients/${client.id}/issues?type%5B%5D=${encodeURIComponent(type)}`,
            })),
        [client.id, issue_distribution.by_type],
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
                href: `/clients/${client.id}/finance`,
            }));
    }, [activeCurrencyAnalysis, client.id]);
    const statCards = [
        {
            key: 'members',
            label: 'Members',
            icon: Users,
            href: `/clients/${client.id}/members`,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
            visible: can_view_members,
        },
        {
            key: 'projects',
            label: 'Projects',
            icon: FolderKanban,
            href: `/clients/${client.id}/projects`,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-100 dark:bg-violet-900/30',
            visible: true,
        },
        {
            key: 'issues',
            label: 'Total Issues',
            icon: Ticket,
            href: `/clients/${client.id}/issues`,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
            visible: true,
        },
        {
            key: 'open_issues',
            label: 'Open Issues',
            icon: Activity,
            href: `/clients/${client.id}/issues?status%5B%5D=todo&status%5B%5D=in_progress`,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-100 dark:bg-red-900/30',
            visible: true,
        },
        {
            key: 'boards',
            label: 'Boards',
            icon: LayoutGrid,
            href: `/clients/${client.id}/boards`,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-100 dark:bg-indigo-900/30',
            visible: summary.boards_count > 0 || Boolean(stats.boards),
        },
        {
            key: 'statuses',
            label: 'Statuses',
            icon: CheckCircle2,
            href: `/clients/${client.id}/statuses`,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-100 dark:bg-emerald-900/30',
            visible: Boolean(stats.statuses),
        },
        {
            key: 'invoices',
            label: 'Invoices',
            icon: Receipt,
            href: `/clients/${client.id}/finance`,
            color: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-100 dark:bg-pink-900/30',
            visible: can_view_finance && Boolean(stats.invoices),
        },
        {
            key: 'transactions',
            label: 'Transactions',
            icon: Wallet,
            href: `/clients/${client.id}/finance`,
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-100 dark:bg-teal-900/30',
            visible: can_view_finance && Boolean(stats.transactions),
        },
    ] as const;

    return (
        <>
            <Head title={client.name} />

            <CrudPage
                title={client.name}
                description={
                    can_view_internal_client_profile
                        ? 'Client workspace overview, finance pulse, and relationship context.'
                        : 'Your workspace overview, recent work, and money pulse with Nour.'
                }
            >
                <div className="space-y-8">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards
                            .filter((card) => card.visible)
                            .map((card) => {
                                const stat = stats[card.key];

                                if (!stat) {
                                    return null;
                                }

                                const Icon = card.icon;

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
                                                        {stat.new_this_month >
                                                        0 ? (
                                                            <span className="inline-flex items-center gap-0.5 text-xs whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                                                                <ArrowUpRight className="size-3" />
                                                                +
                                                                {
                                                                    stat.new_this_month
                                                                }
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

                    {can_view_finance ? (
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
                    ) : null}

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

                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <Activity className="size-5 text-blue-500" />
                            Work Pulse
                        </h2>

                        <div className="grid gap-4 lg:grid-cols-3">
                            <DistributionCard
                                title="Issues by Status"
                                segments={issueStatusSegments}
                            />
                            <DistributionCard
                                title="Issues by Priority"
                                segments={issuePrioritySegments}
                            />
                            <DistributionCard
                                title="Issues by Type"
                                segments={issueTypeSegments}
                            />
                        </div>

                        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.5fr)]">
                            <div className="space-y-2">
                                <AlertIndicator
                                    icon={AlertTriangle}
                                    label="Overdue"
                                    count={issue_distribution.overdue_count}
                                    tone="red"
                                    href={`/clients/${client.id}/issues?sort_by=due_date&sort_direction=asc`}
                                />
                                <AlertIndicator
                                    icon={UserX}
                                    label="Unassigned"
                                    count={issue_distribution.unassigned_count}
                                    tone="amber"
                                    href={`/clients/${client.id}/issues`}
                                />
                                <AlertIndicator
                                    icon={Inbox}
                                    label="Backlog"
                                    count={board_summary.backlog_count}
                                    tone="slate"
                                    href={`/clients/${client.id}/boards`}
                                />
                            </div>

                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Recent Issues
                                    </CardTitle>
                                    <Link
                                        href={`/clients/${client.id}/issues`}
                                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        View all
                                    </Link>
                                </CardHeader>
                                <CardContent>
                                    {recent_issues.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-muted-foreground">
                                            No issues yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-1">
                                            {recent_issues.map((issue) => (
                                                <Link
                                                    key={issue.id}
                                                    href={`/clients/${client.id}/projects/${issue.project_id}/issues/${issue.id}`}
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
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <FolderKanban className="size-5 text-violet-500" />
                            Projects & Workspace
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
                                    <ProjectStatusChart
                                        clientId={client.id}
                                        statuses={project_health.by_status}
                                    />
                                </CardContent>
                            </Card>

                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0">
                                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <TrendingUp className="size-4 text-blue-500" />
                                        Most Active Projects
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {project_health.top_projects.length ===
                                    0 ? (
                                        <p className="py-8 text-center text-sm text-muted-foreground">
                                            No projects yet.
                                        </p>
                                    ) : (
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {project_health.top_projects.map(
                                                (project, index) => {
                                                    const maxIssues = Math.max(
                                                        ...project_health.top_projects.map(
                                                            (entry) =>
                                                                entry.issues_count,
                                                        ),
                                                        1,
                                                    );
                                                    const percent = Math.round(
                                                        (project.issues_count /
                                                            maxIssues) *
                                                            100,
                                                    );

                                                    return (
                                                        <Link
                                                            key={project.id}
                                                            href={`/clients/${client.id}/projects/${project.id}`}
                                                            className={cn(
                                                                'group rounded-xl border bg-gradient-to-br p-4 transition-all hover:shadow-md',
                                                                projectCardGradients[
                                                                    index %
                                                                        projectCardGradients.length
                                                                ],
                                                            )}
                                                        >
                                                            <p className="truncate text-sm font-semibold group-hover:underline">
                                                                {project.name}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                                                {
                                                                    project.client_name
                                                                }
                                                            </p>
                                                            <div className="mt-3 space-y-1.5">
                                                                <div className="flex items-end justify-between">
                                                                    <span
                                                                        className={cn(
                                                                            'text-2xl font-bold tabular-nums',
                                                                            projectCountColors[
                                                                                index %
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
                                                                            width: `${percent}%`,
                                                                            backgroundColor:
                                                                                projectStatusColors[
                                                                                    index %
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
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid gap-4 lg:grid-cols-2">
                            <Card className="shadow-none">
                                <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        Recent Projects
                                    </CardTitle>
                                    <Link
                                        href={`/clients/${client.id}/projects`}
                                        className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        View all
                                    </Link>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {recent_projects.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-muted-foreground">
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
                                </CardContent>
                            </Card>

                            {can_view_members ? (
                                <Card className="shadow-none">
                                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Recent Members
                                        </CardTitle>
                                        <Link
                                            href={`/clients/${client.id}/members`}
                                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            View all
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recent_members.length === 0 ? (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                No client members yet.
                                            </p>
                                        ) : (
                                            recent_members.map((membership) => {
                                                const avatarSrc = membership
                                                    .user.avatar_path
                                                    ? `/storage/${membership.user.avatar_path}`
                                                    : null;

                                                return (
                                                    <div
                                                        key={membership.id}
                                                        className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                                    >
                                                        <Avatar className="size-8">
                                                            {avatarSrc ? (
                                                                <AvatarImage
                                                                    src={
                                                                        avatarSrc
                                                                    }
                                                                    alt={
                                                                        membership
                                                                            .user
                                                                            .name
                                                                    }
                                                                />
                                                            ) : null}
                                                            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                                {membership.user.name
                                                                    .split(' ')
                                                                    .map(
                                                                        (
                                                                            part,
                                                                        ) =>
                                                                            part[0],
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
                                                                        membership
                                                                            .user
                                                                            .name
                                                                    }
                                                                </Link>
                                                            ) : (
                                                                <p className="font-medium">
                                                                    {
                                                                        membership
                                                                            .user
                                                                            .name
                                                                    }
                                                                </p>
                                                            )}
                                                            <p className="text-sm text-muted-foreground">
                                                                {
                                                                    membership
                                                                        .user
                                                                        .email
                                                                }{' '}
                                                                ·{' '}
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[10px] capitalize"
                                                                >
                                                                    {
                                                                        membership.role
                                                                    }
                                                                </Badge>
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </CardContent>
                                </Card>
                            ) : null}
                        </div>
                    </div>

                    {can_view_finance ? (
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
                                    href={`/clients/${client.id}/finance`}
                                />
                                <FinanceMetricCard
                                    title="Lifetime Invoiced"
                                    icon={CreditCard}
                                    summary={
                                        finance_analysis.overall
                                            .relationship_volume
                                    }
                                    href={`/clients/${client.id}/finance`}
                                />
                                <FinanceMetricCard
                                    title="Running Account"
                                    icon={Scale}
                                    summary={
                                        finance_analysis.overall.running_account
                                    }
                                    href={`/clients/${client.id}/finance`}
                                />
                                <Link href={`/clients/${client.id}/finance`}>
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
                                                    activeCurrencyAnalysis?.open_invoice_total ??
                                                    0
                                                }
                                                currency={
                                                    activeCurrencyAnalysis?.currency ??
                                                    null
                                                }
                                                className="text-xl"
                                            />
                                        </CardContent>
                                    </Card>
                                </Link>
                            </div>

                            <div className="grid gap-4 xl:grid-cols-3">
                                <DistributionCard
                                    title="Invoice Status Breakdown"
                                    segments={invoiceStatusSegments}
                                />

                                <Card className="shadow-none">
                                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Recent Invoices
                                        </CardTitle>
                                        <Link
                                            href={`/clients/${client.id}/finance`}
                                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            View all
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recent_invoices.length === 0 ? (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                No invoices yet.
                                            </p>
                                        ) : (
                                            recent_invoices.map((invoice) => (
                                                <Link
                                                    key={invoice.id}
                                                    href={`/clients/${client.id}/finance`}
                                                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-muted/40"
                                                >
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-medium">
                                                            {invoice.reference}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <FinanceStatusBadge
                                                                status={
                                                                    invoice.status
                                                                }
                                                            />
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDateOnly(
                                                                    invoice.issued_at,
                                                                ) ??
                                                                    'No issue date'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <FinanceAmount
                                                        amount={invoice.amount}
                                                        currency={
                                                            invoice.currency
                                                        }
                                                    />
                                                </Link>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="shadow-none">
                                    <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">
                                            Recent Transactions
                                        </CardTitle>
                                        <Link
                                            href={`/clients/${client.id}/finance`}
                                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                                        >
                                            View all
                                        </Link>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recent_transactions.length === 0 ? (
                                            <p className="py-8 text-center text-sm text-muted-foreground">
                                                No transactions yet.
                                            </p>
                                        ) : (
                                            recent_transactions.map(
                                                (transaction) => (
                                                    <Link
                                                        key={transaction.id}
                                                        href={`/clients/${client.id}/finance`}
                                                        className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/70 p-3 transition-colors hover:bg-muted/40"
                                                    >
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-medium">
                                                                {
                                                                    transaction.description
                                                                }
                                                            </p>
                                                            <span className="text-xs text-muted-foreground">
                                                                {formatDateOnly(
                                                                    transaction.occurred_date,
                                                                ) ?? 'No date'}
                                                            </span>
                                                        </div>
                                                        <FinanceAmount
                                                            amount={
                                                                transaction.amount
                                                            }
                                                            currency={
                                                                transaction.currency
                                                            }
                                                        />
                                                    </Link>
                                                ),
                                            )
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : null}

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
                                                    {entry.subject_type ? (
                                                        <span className="font-medium">
                                                            {entry.subject_type}
                                                            {entry.subject_id
                                                                ? ` #${entry.subject_id}`
                                                                : ''}
                                                        </span>
                                                    ) : null}
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

                    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                        <Card className="shadow-none">
                            <CardHeader className="flex-row items-center justify-between space-y-0">
                                <div className="flex items-center gap-3">
                                    <Avatar className="size-10">
                                        {client.image_path ? (
                                            <AvatarImage
                                                src={`/storage/${client.image_path}`}
                                                alt={client.name}
                                            />
                                        ) : null}
                                        <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                            {client.name
                                                .split(' ')
                                                .map((part) => part[0])
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
                                        <Link
                                            href={`/clients/${client.id}/edit`}
                                        >
                                            <Pencil className="mr-1.5 size-3.5" />
                                            Edit client
                                        </Link>
                                    </Button>
                                ) : null}
                            </CardHeader>
                            <CardContent className="grid gap-4 sm:grid-cols-2">
                                <ProfileField
                                    label="Name"
                                    value={client.name}
                                />
                                <ProfileField
                                    label="Email"
                                    value={client.email}
                                />
                                {can_view_internal_client_profile ? (
                                    <>
                                        <ProfileField
                                            label="Behavior"
                                            value={
                                                client.behavior?.name ?? null
                                            }
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
                                            value={formatDateOnly(
                                                client.birthday,
                                            )}
                                        />
                                        <ProfileField
                                            label="Origin"
                                            value={client.origin}
                                        />
                                        <ProfileField
                                            label="Tags"
                                            value={
                                                client.tags.join(', ') || null
                                            }
                                            fullWidth
                                        />
                                        <ProfileField
                                            label="Phone numbers"
                                            value={
                                                client.phone_numbers
                                                    .map((phone) =>
                                                        [
                                                            phone.label,
                                                            phone.number,
                                                        ]
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
                                        value="This workspace is scoped for collaboration and delivery. Internal relationship notes and owner-side classifications are not exposed here."
                                        fullWidth
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Workspace Snapshot</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <SnapshotRow
                                    label="Members"
                                    value={summary.members_count}
                                />
                                <SnapshotRow
                                    label="Projects"
                                    value={summary.projects_count}
                                />
                                <SnapshotRow
                                    label="Issues"
                                    value={summary.issues_count}
                                />
                                <SnapshotRow
                                    label="Boards"
                                    value={summary.boards_count}
                                />
                                <SnapshotRow
                                    label="Statuses"
                                    value={summary.statuses_count}
                                />
                            </CardContent>
                        </Card>
                    </div>

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
            </CrudPage>
        </>
    );
}

function DistributionCard({
    title,
    segments,
}: {
    title: string;
    segments: Array<{
        label: string;
        value: number;
        color: string;
        href: string;
    }>;
}) {
    return (
        <Card className="shadow-none">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {segments.length > 0 ? (
                    <DistributionChart segments={segments} label="total" />
                ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        No data yet.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function ProjectStatusChart({
    clientId,
    statuses,
}: {
    clientId: number;
    statuses: { name: string; slug: string; count: number }[];
}) {
    const chartRef = useRef<ChartJS<'bar'>>(null);
    const chartData = useMemo(
        () => ({
            labels: statuses.map((status) => status.name),
            datasets: [
                {
                    data: statuses.map((status) => status.count),
                    backgroundColor: statuses.map(
                        (_, index) =>
                            projectStatusColors[
                                index % projectStatusColors.length
                            ] + 'bb',
                    ),
                    borderColor: statuses.map(
                        (_, index) =>
                            projectStatusColors[
                                index % projectStatusColors.length
                            ],
                    ),
                    borderWidth: 1.5,
                    borderRadius: 6,
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
            onClick: (_event: unknown, elements: { index: number }[]) => {
                const element = elements[0];

                if (!element) {
                    return;
                }

                const status = statuses[element.index];

                if (!status) {
                    return;
                }

                router.get(`/clients/${clientId}/projects`, {
                    'status[]': status.slug,
                });
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
                },
            },
        }),
        [clientId, statuses],
    );

    if (statuses.length === 0) {
        return (
            <p className="py-8 text-center text-sm text-muted-foreground">
                No project status data yet.
            </p>
        );
    }

    return (
        <div className="h-72">
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
        </div>
    );
}

function FinanceMetricCard({
    title,
    icon: Icon,
    summary,
    href,
}: {
    title: string;
    icon: typeof Wallet;
    summary: MoneySummary;
    href?: string;
}) {
    const card = (
        <Card
            className={cn(
                'shadow-none',
                href ? 'transition-all hover:bg-muted/30 hover:shadow-sm' : '',
            )}
        >
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

    if (href) {
        return <Link href={href}>{card}</Link>;
    }

    return card;
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
    return (
        <span
            className="block size-2.5 shrink-0 rounded-full"
            style={{
                backgroundColor: issueStatusColors[status] ?? '#94a3b8',
            }}
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

function SnapshotRow({ label, value }: { label: string; value: number }) {
    return (
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-lg font-semibold tabular-nums">{value}</span>
        </div>
    );
}

ClientShow.layout = (page: ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
