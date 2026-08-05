import { Head, router } from '@inertiajs/react';
import {
    CategoryScale,
    Chart as ChartJS,
    Filler,
    Legend,
    LinearScale,
    LineElement,
    PointElement,
    Tooltip,
} from 'chart.js';
import type { ChartOptions } from 'chart.js';
import {
    Activity,
    BarChart3,
    BookOpenCheck,
    Clock3,
    Eye,
    Gauge,
    GraduationCap,
    Info,
    MessageCircle,
    MonitorSmartphone,
    MousePointerClick,
    PlayCircle,
    Presentation,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Line } from 'react-chartjs-2';
import { CrudPage } from '@/components/crud/crud-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
);

type Filters = {
    days: 7 | 30 | 90;
    scope: 'all' | 'portfolio' | 'projects' | 'education' | 'lectures';
    from: string;
    to: string;
};

type Summary = {
    visitors: number;
    sessions: number;
    page_views: number;
    views_per_session: number;
    bounced_sessions: number;
    engaged_sessions: number;
    bounce_rate: number;
    engagement_rate: number;
    avg_engagement_seconds: number;
    key_events: number;
};

type TrendPoint = {
    date: string;
    label: string;
    visitors: number;
    sessions: number;
    page_views: number;
    engaged_sessions: number;
};

type EducationSummary = {
    landing_views: number;
    lecture_views: number;
    video_starts: number;
    video_completions: number;
    presentation_opens: number;
    whatsapp_clicks: number;
};

type PageRow = {
    path: string;
    title: string;
    page_type: string;
    views: number;
    visitors: number;
    avg_engagement_seconds: number;
    avg_scroll_depth: number;
};

type ProjectRow = {
    project_id: number | null;
    name: string;
    path: string;
    views: number;
    visitors: number;
    avg_engagement_seconds: number;
    avg_scroll_depth: number;
};

type BreakdownRow = {
    label: string;
    count: number;
    percentage: number;
};

type EventRow = {
    name: string;
    label: string;
    count: number;
};

type AnalyticsProps = {
    filters: Filters;
    summary: Summary;
    trend: TrendPoint[];
    education: EducationSummary;
    top_pages: PageRow[];
    project_views: ProjectRow[];
    sources: BreakdownRow[];
    devices: BreakdownRow[];
    events: EventRow[];
    freshness: {
        last_event_at: string | null;
        retention_months: number;
    };
    definitions: Record<string, string>;
};

const scopes: { value: Filters['scope']; label: string }[] = [
    { value: 'all', label: 'All website' },
    { value: 'portfolio', label: 'Portfolio' },
    { value: 'projects', label: 'Projects' },
    { value: 'education', label: 'Education' },
    { value: 'lectures', label: 'Lectures' },
];

const cardTones = {
    emerald:
        'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
} as const;

function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);

    return `${minutes}m ${remainder}s`;
}

function MetricCard({
    label,
    value,
    detail,
    icon,
    tone,
}: {
    label: string;
    value: string;
    detail: string;
    icon: ReactNode;
    tone: keyof typeof cardTones;
}) {
    return (
        <Card className="gap-4 border py-5">
            <CardContent className="flex items-start justify-between gap-4 px-5">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                        {label}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
                        {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {detail}
                    </p>
                </div>
                <span
                    className={cn(
                        'flex size-10 shrink-0 items-center justify-center rounded-xl',
                        cardTones[tone],
                    )}
                >
                    {icon}
                </span>
            </CardContent>
        </Card>
    );
}

function EmptyState({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-44 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            {children}
        </div>
    );
}

function Breakdown({ rows, color }: { rows: BreakdownRow[]; color: string }) {
    if (rows.length === 0) {
        return <EmptyState>No traffic recorded yet.</EmptyState>;
    }

    return (
        <div className="space-y-4">
            {rows.map((row) => (
                <div key={row.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-medium">
                            {row.label}
                        </span>
                        <span className="shrink-0 text-muted-foreground tabular-nums">
                            {formatNumber(row.count)} · {row.percentage}%
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn('h-full rounded-full', color)}
                            style={{ width: `${Math.max(row.percentage, 2)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function PageTable({ rows }: { rows: PageRow[] }) {
    if (rows.length === 0) {
        return <EmptyState>No page views in this period.</EmptyState>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
                <thead>
                    <tr className="border-b text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <th className="pb-3">Page</th>
                        <th className="pb-3 text-right">Views</th>
                        <th className="pb-3 text-right">Visitors</th>
                        <th className="pb-3 text-right">Active time</th>
                        <th className="pb-3 text-right">Scroll</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.path} className="border-b last:border-0">
                            <td className="py-4 pr-6">
                                <div className="flex items-center gap-2">
                                    <span className="max-w-md truncate font-medium">
                                        {row.title}
                                    </span>
                                    <Badge
                                        variant="outline"
                                        className="font-normal"
                                    >
                                        {row.page_type.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <code className="mt-1 block max-w-md truncate text-xs text-muted-foreground">
                                    {row.path}
                                </code>
                            </td>
                            <td className="py-4 text-right font-medium tabular-nums">
                                {formatNumber(row.views)}
                            </td>
                            <td className="py-4 text-right text-muted-foreground tabular-nums">
                                {formatNumber(row.visitors)}
                            </td>
                            <td className="py-4 text-right text-muted-foreground tabular-nums">
                                {formatDuration(row.avg_engagement_seconds)}
                            </td>
                            <td className="py-4 text-right text-muted-foreground tabular-nums">
                                {row.avg_scroll_depth}%
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function ProjectTable({ rows }: { rows: ProjectRow[] }) {
    if (rows.length === 0) {
        return <EmptyState>No project views in this period.</EmptyState>;
    }

    const maxViews = Math.max(...rows.map((row) => row.views), 1);

    return (
        <div className="space-y-5">
            {rows.slice(0, 10).map((row, index) => (
                <div
                    key={row.path}
                    className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tabular-nums">
                                {index + 1}
                            </span>
                            <span className="truncate font-medium">
                                {row.name}
                            </span>
                        </div>
                        <div className="mt-2 ml-10 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-violet-500"
                                style={{
                                    width: `${(row.views / maxViews) * 100}%`,
                                }}
                            />
                        </div>
                    </div>
                    <div className="ml-10 flex gap-4 text-xs text-muted-foreground sm:ml-0 sm:items-center">
                        <span>
                            <strong className="text-foreground">
                                {row.views}
                            </strong>{' '}
                            views
                        </span>
                        <span>
                            {formatDuration(row.avg_engagement_seconds)} active
                        </span>
                        <span>{row.avg_scroll_depth}% scroll</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function CmsAnalyticsPage({
    filters,
    summary,
    trend,
    education,
    top_pages,
    project_views,
    sources,
    devices,
    events,
    freshness,
    definitions,
}: AnalyticsProps) {
    const updateFilter = (next: Partial<Pick<Filters, 'days' | 'scope'>>) => {
        router.get(
            '/cms/analytics',
            {
                days: next.days ?? filters.days,
                scope: next.scope ?? filters.scope,
            },
            { preserveScroll: true, preserveState: true, replace: true },
        );
    };

    const trafficData = {
        labels: trend.map((point) => point.label),
        datasets: [
            {
                label: 'Page views',
                data: trend.map((point) => point.page_views),
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                pointBackgroundColor: '#2563eb',
                pointRadius: trend.length <= 30 ? 2 : 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                tension: 0.35,
                fill: true,
            },
            {
                label: 'Sessions',
                data: trend.map((point) => point.sessions),
                borderColor: '#059669',
                backgroundColor: 'transparent',
                pointBackgroundColor: '#059669',
                pointRadius: trend.length <= 30 ? 2 : 0,
                pointHoverRadius: 4,
                borderWidth: 2,
                tension: 0.35,
            },
            {
                label: 'Engaged',
                data: trend.map((point) => point.engaged_sessions),
                borderColor: '#7c3aed',
                backgroundColor: 'transparent',
                pointBackgroundColor: '#7c3aed',
                pointRadius: 0,
                pointHoverRadius: 4,
                borderWidth: 1.5,
                borderDash: [5, 5],
                tension: 0.35,
            },
        ],
    };
    const trafficOptions: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
            y: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: 'rgba(148, 163, 184, 0.12)' },
            },
        },
        plugins: {
            legend: {
                position: 'bottom',
                labels: { usePointStyle: true, pointStyle: 'circle' },
            },
            tooltip: { padding: 10, cornerRadius: 8 },
        },
    };
    const educationMetrics = [
        {
            label: 'Landing views',
            value: education.landing_views,
            icon: <GraduationCap className="size-5" />,
            tone: 'emerald' as const,
        },
        {
            label: 'Lecture views',
            value: education.lecture_views,
            icon: <BookOpenCheck className="size-5" />,
            tone: 'blue' as const,
        },
        {
            label: 'Video starts',
            value: education.video_starts,
            icon: <PlayCircle className="size-5" />,
            tone: 'violet' as const,
        },
        {
            label: 'Video completions',
            value: education.video_completions,
            icon: <Gauge className="size-5" />,
            tone: 'cyan' as const,
        },
        {
            label: 'Presentation opens',
            value: education.presentation_opens,
            icon: <Presentation className="size-5" />,
            tone: 'amber' as const,
        },
        {
            label: 'WhatsApp clicks',
            value: education.whatsapp_clicks,
            icon: <MessageCircle className="size-5" />,
            tone: 'emerald' as const,
        },
    ];

    return (
        <>
            <Head title="Website Analytics" />
            <CrudPage
                title="Website analytics"
                description="First-party visitor, education, lecture, and project behavior from nouraboelsoud.com."
                titleMeta={
                    <Badge variant="outline">Anonymous · first-party</Badge>
                }
                actions={
                    <div className="hidden text-right text-xs text-muted-foreground sm:block">
                        <p className="font-medium text-foreground">
                            Last signal
                        </p>
                        <p>
                            {freshness.last_event_at
                                ? new Date(
                                      freshness.last_event_at,
                                  ).toLocaleString()
                                : 'No visits yet'}
                        </p>
                    </div>
                }
            >
                <div className="flex flex-col justify-between gap-3 rounded-xl border bg-card p-3 lg:flex-row lg:items-center">
                    <div className="flex flex-wrap gap-2">
                        {scopes.map((scope) => (
                            <Button
                                key={scope.value}
                                size="sm"
                                variant={
                                    filters.scope === scope.value
                                        ? 'default'
                                        : 'ghost'
                                }
                                onClick={() =>
                                    updateFilter({ scope: scope.value })
                                }
                            >
                                {scope.label}
                            </Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 text-xs text-muted-foreground">
                            {filters.from} → {filters.to}
                        </span>
                        <span className="px-2 text-xs text-muted-foreground sm:hidden">
                            Updated{' '}
                            {freshness.last_event_at
                                ? new Date(
                                      freshness.last_event_at,
                                  ).toLocaleString()
                                : 'after the first visit'}
                        </span>
                        {[7, 30, 90].map((days) => (
                            <Button
                                key={days}
                                size="sm"
                                variant={
                                    filters.days === days
                                        ? 'secondary'
                                        : 'ghost'
                                }
                                onClick={() =>
                                    updateFilter({
                                        days: days as Filters['days'],
                                    })
                                }
                            >
                                {days} days
                            </Button>
                        ))}
                    </div>
                </div>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                    <MetricCard
                        label="Visitors"
                        value={formatNumber(summary.visitors)}
                        detail="Anonymous browsers"
                        icon={<Users className="size-5" />}
                        tone="emerald"
                    />
                    <MetricCard
                        label="Sessions"
                        value={formatNumber(summary.sessions)}
                        detail={`${summary.views_per_session} views per session`}
                        icon={<Activity className="size-5" />}
                        tone="blue"
                    />
                    <MetricCard
                        label="Page views"
                        value={formatNumber(summary.page_views)}
                        detail={`${summary.key_events} meaningful actions`}
                        icon={<Eye className="size-5" />}
                        tone="violet"
                    />
                    <MetricCard
                        label="Engagement rate"
                        value={`${summary.engagement_rate}%`}
                        detail={`${summary.engaged_sessions} engaged sessions`}
                        icon={<MousePointerClick className="size-5" />}
                        tone="cyan"
                    />
                    <MetricCard
                        label="Bounce rate"
                        value={`${summary.bounce_rate}%`}
                        detail={`${summary.bounced_sessions} bounced sessions`}
                        icon={<BarChart3 className="size-5" />}
                        tone="rose"
                    />
                    <MetricCard
                        label="Average active time"
                        value={formatDuration(summary.avg_engagement_seconds)}
                        detail="Visible, recently active time"
                        icon={<Clock3 className="size-5" />}
                        tone="amber"
                    />
                </section>

                <Card className="border">
                    <CardHeader>
                        <CardTitle>Traffic and engagement</CardTitle>
                        <CardDescription>
                            Daily sessions, page views, and engaged sessions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {summary.sessions > 0 ? (
                            <div className="h-80">
                                <Line
                                    data={trafficData}
                                    options={trafficOptions}
                                />
                            </div>
                        ) : (
                            <EmptyState>
                                Traffic will appear after the first public
                                visit.
                            </EmptyState>
                        )}
                    </CardContent>
                </Card>

                <section>
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold">
                            Education and lecture journey
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            From the education landing page to video,
                            presentation, and contact actions.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                        {educationMetrics.map((metric) => (
                            <Card
                                key={metric.label}
                                className="gap-3 border py-5"
                            >
                                <CardContent className="flex items-center gap-4 px-5">
                                    <span
                                        className={cn(
                                            'flex size-10 items-center justify-center rounded-xl',
                                            cardTones[metric.tone],
                                        )}
                                    >
                                        {metric.icon}
                                    </span>
                                    <div>
                                        <p className="text-2xl font-bold tabular-nums">
                                            {formatNumber(metric.value)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {metric.label}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <Card className="border">
                    <CardHeader>
                        <CardTitle>Top pages</CardTitle>
                        <CardDescription>
                            Volume plus the depth of attention each page earned.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PageTable rows={top_pages} />
                    </CardContent>
                </Card>

                <div className="grid gap-6 xl:grid-cols-2">
                    <Card className="border">
                        <CardHeader>
                            <CardTitle>Project interest</CardTitle>
                            <CardDescription>
                                Case-study views, active time, and scroll depth.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ProjectTable rows={project_views} />
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardHeader>
                            <CardTitle>Meaningful actions</CardTitle>
                            <CardDescription>
                                Clicks and media events beyond passive page
                                viewing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {events.length > 0 ? (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {events.map((event) => (
                                        <div
                                            key={event.name}
                                            className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3"
                                        >
                                            <span className="text-sm font-medium">
                                                {event.label}
                                            </span>
                                            <Badge
                                                variant="secondary"
                                                className="tabular-nums"
                                            >
                                                {formatNumber(event.count)}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState>
                                    No actions recorded yet.
                                </EmptyState>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <Card className="border">
                        <CardHeader>
                            <CardTitle>Traffic sources</CardTitle>
                            <CardDescription>
                                Session acquisition from campaign tags and
                                referrer hosts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Breakdown rows={sources} color="bg-blue-500" />
                        </CardContent>
                    </Card>
                    <Card className="border">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MonitorSmartphone className="size-4" /> Devices
                            </CardTitle>
                            <CardDescription>
                                Desktop, tablet, and mobile session mix.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Breakdown rows={devices} color="bg-emerald-500" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="border bg-muted/20">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="size-4" /> How these numbers are
                            counted
                        </CardTitle>
                        <CardDescription>
                            No raw IP addresses, query strings, form values,
                            names, or contact details are stored. Raw records
                            are retained for {freshness.retention_months}{' '}
                            months.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        {Object.entries(definitions).map(
                            ([key, definition]) => (
                                <div key={key}>
                                    <p className="text-xs font-semibold tracking-wide uppercase">
                                        {key.replaceAll('_', ' ')}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                        {definition}
                                    </p>
                                </div>
                            ),
                        )}
                    </CardContent>
                </Card>
            </CrudPage>
        </>
    );
}

CmsAnalyticsPage.layout = (page: ReactNode) => <AppLayout>{page}</AppLayout>;
