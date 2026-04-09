import { Head, router } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Clock,
    Filter,
    Globe,
    Search,
    User,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';

type AuditLog = {
    id: number;
    user_id: number | null;
    event: string;
    source: string;
    subject_type: string | null;
    subject_id: number | null;
    metadata_json: Record<string, unknown> | null;
    before_json: Record<string, unknown> | null;
    after_json: Record<string, unknown> | null;
    created_at: string;
    user: { id: number; name: string; email: string } | null;
};

function formatSubjectType(type: string | null): string {
    if (!type) return '—';
    const parts = type.split('\\');
    return parts[parts.length - 1];
}

function eventColor(event: string): string {
    if (event.includes('create') || event.includes('store'))
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    if (event.includes('update') || event.includes('edit'))
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (event.includes('delete') || event.includes('destroy'))
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    return 'bg-muted text-muted-foreground';
}

function sourceIcon(source: string) {
    if (source === 'assistant' || source === 'ai') return Bot;
    if (source === 'api') return Globe;
    return User;
}

export default function AuditLogsIndex({
    logs,
    pagination,
    filters,
    event_options,
    source_options,
}: {
    logs: AuditLog[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: { search: string; event: string; source: string };
    event_options: string[];
    source_options: string[];
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [event, setEvent] = useState(filters.event ?? '');
    const [source, setSource] = useState(filters.source ?? '');

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/audit-logs',
                {
                    search: query || undefined,
                    event: event || undefined,
                    source: source || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 250);
        return () => window.clearTimeout(timeout);
    }, [query, event, source]);

    return (
        <>
            <Head title="Audit Logs" />
            <CrudPage
                title="Audit Logs"
                description="Track all user and system actions across the platform."
            >
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search logs..."
                            className="pl-9 md:max-w-sm"
                        />
                    </div>
                    <Select value={event || '__all__'} onValueChange={(v) => setEvent(v === '__all__' ? '' : v)}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="mr-2 size-4" />
                            <SelectValue placeholder="All events" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All events</SelectItem>
                            {event_options.filter(Boolean).map((e) => (
                                <SelectItem key={e} value={e}>
                                    {e}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={source || '__all__'} onValueChange={(v) => setSource(v === '__all__' ? '' : v)}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="mr-2 size-4" />
                            <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All sources</SelectItem>
                            {source_options.filter(Boolean).map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                        {pagination.total} total
                    </span>
                </div>

                {/* Log entries */}
                <div className="space-y-2">
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Activity className="mb-3 size-10 text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                No audit logs found.
                            </p>
                        </div>
                    ) : (
                        logs.map((log) => {
                            const SourceIcon = sourceIcon(log.source);
                            return (
                                <Card
                                    key={log.id}
                                    className="shadow-none transition-colors hover:bg-muted/30"
                                >
                                    <CardContent className="flex items-start gap-4 px-4 py-3">
                                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                            <SourceIcon className="size-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${eventColor(log.event)}`}
                                                >
                                                    {log.event}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {formatSubjectType(
                                                        log.subject_type,
                                                    )}
                                                    {log.subject_id
                                                        ? ` #${log.subject_id}`
                                                        : ''}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    via {log.source}
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="size-3" />
                                                <span>
                                                    {log.user?.name ??
                                                        'System'}
                                                </span>
                                                <Clock className="ml-2 size-3" />
                                                <span>
                                                    {new Date(
                                                        log.created_at,
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-between pt-4">
                        <p className="text-sm text-muted-foreground">
                            Page {pagination.current_page} of{' '}
                            {pagination.last_page}
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled={pagination.current_page <= 1}
                                onClick={() =>
                                    router.get(
                                        '/audit-logs',
                                        {
                                            page: pagination.current_page - 1,
                                            search: query || undefined,
                                            event: event || undefined,
                                            source: source || undefined,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                disabled={
                                    pagination.current_page >=
                                    pagination.last_page
                                }
                                onClick={() =>
                                    router.get(
                                        '/audit-logs',
                                        {
                                            page: pagination.current_page + 1,
                                            search: query || undefined,
                                            event: event || undefined,
                                            source: source || undefined,
                                        },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                        },
                                    )
                                }
                                className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </CrudPage>
        </>
    );
}

AuditLogsIndex.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
