import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    BriefcaseBusiness,
    Clock,
    FolderKanban,
    LayoutGrid,
    Receipt,
    Ticket,
    Users,
    Wallet,
} from 'lucide-react';
import { CrudPage } from '@/components/crud/crud-page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { formatRelativeInstant } from '@/lib/datetime';

type Stats = {
    clients: number;
    projects: number;
    issues: number;
    open_issues: number;
    invoices: number;
    transactions: number;
    users: number;
    boards: number;
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

const statCards = [
    {
        key: 'clients',
        label: 'Clients',
        icon: BriefcaseBusiness,
        href: '/clients',
        color: 'text-violet-600 dark:text-violet-400',
    },
    {
        key: 'projects',
        label: 'Projects',
        icon: FolderKanban,
        href: '/clients',
        color: 'text-blue-600 dark:text-blue-400',
    },
    {
        key: 'issues',
        label: 'Total Issues',
        icon: Ticket,
        href: '/tracking/issues',
        color: 'text-amber-600 dark:text-amber-400',
    },
    {
        key: 'open_issues',
        label: 'Open Issues',
        icon: Activity,
        href: '/tracking/issues',
        color: 'text-red-600 dark:text-red-400',
    },
    {
        key: 'users',
        label: 'Users',
        icon: Users,
        href: '/clients',
        color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        key: 'boards',
        label: 'Boards',
        icon: LayoutGrid,
        href: '/tracking/boards',
        color: 'text-indigo-600 dark:text-indigo-400',
    },
    {
        key: 'invoices',
        label: 'Invoices',
        icon: Receipt,
        href: '/finance/invoices',
        color: 'text-pink-600 dark:text-pink-400',
    },
    {
        key: 'transactions',
        label: 'Transactions',
        icon: Wallet,
        href: '/finance/transactions',
        color: 'text-teal-600 dark:text-teal-400',
    },
] as const;

export default function Overview({
    stats,
    recent_activity,
}: {
    stats: Stats;
    recent_activity: ActivityEntry[];
}) {
    return (
        <>
            <Head title="Overview" />

            <CrudPage
                title="Overview"
                description="Platform-wide summary and recent activity"
            >
                <div className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards.map((card) => {
                            const Icon = card.icon;
                            const value = stats[card.key as keyof Stats];

                            return (
                                <Link key={card.key} href={card.href}>
                                    <Card className="shadow-none transition-colors hover:bg-muted/30">
                                        <CardContent className="flex items-center gap-4 p-4">
                                            <div
                                                className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted ${card.color}`}
                                            >
                                                <Icon className="size-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">
                                                    {card.label}
                                                </p>
                                                <p className="text-2xl font-bold">
                                                    {value}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })}
                    </div>

                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="size-5" />
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

Overview.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
