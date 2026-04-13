import { Head, router } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Boxes,
    Clock,
    Globe,
    Layers,
    Search,
    User,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CrudPage } from '@/components/crud/crud-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

type FilterOption = { id: number; name: string };
type SubjectTypeOption = { value: string; label: string };

function formatSubjectType(type: string | null): string {
    if (!type) {
        return '—';
    }

    const parts = type.split('\\');

    return parts[parts.length - 1];
}

function eventColor(event: string): string {
    if (event.includes('create') || event.includes('store')) {
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    }

    if (event.includes('update') || event.includes('edit')) {
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }

    if (event.includes('delete') || event.includes('destroy')) {
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    }

    return 'bg-muted text-muted-foreground';
}

function sourceIcon(source: string) {
    if (source === 'assistant' || source === 'ai') {
        return Bot;
    }

    if (source === 'api') {
        return Globe;
    }

    return User;
}

export default function AuditLogsIndex({
    logs,
    pagination,
    filters,
    event_options,
    source_options,
    user_options,
    subject_type_options,
    client_options,
}: {
    logs: AuditLog[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        event: string;
        source: string;
        user_id: string;
        subject_type: string;
        client_id: string;
    };
    event_options: string[];
    source_options: string[];
    user_options: FilterOption[];
    subject_type_options: SubjectTypeOption[];
    client_options: FilterOption[];
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [event, setEvent] = useState(filters.event ?? '');
    const [source, setSource] = useState(filters.source ?? '');
    const [userId, setUserId] = useState(filters.user_id ?? '');
    const [subjectType, setSubjectType] = useState(filters.subject_type ?? '');
    const [clientId, setClientId] = useState(filters.client_id ?? '');

    const activeFilterCount = [event, source, userId, subjectType, clientId].filter(Boolean).length;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/audit-logs',
                {
                    search: query || undefined,
                    event: event || undefined,
                    source: source || undefined,
                    user_id: userId || undefined,
                    subject_type: subjectType || undefined,
                    client_id: clientId || undefined,
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [query, event, source, userId, subjectType, clientId]);

    const eventOpts = event_options.filter(Boolean).map((e) => ({ value: e, label: e }));
    const sourceOpts = source_options.filter(Boolean).map((s) => ({ value: s, label: s }));
    const userOpts = user_options.map((u) => ({ value: String(u.id), label: u.name }));
    const subjectTypeOpts = subject_type_options.map((t) => ({ value: t.value, label: t.label }));
    const clientOpts = client_options.map((c) => ({ value: String(c.id), label: c.name }));

    return (
        <>
            <Head title="Audit Logs" />
            <CrudPage
                title="Audit Logs"
                description="Track all user and system actions across the platform."
            >
                {/* Search + count */}
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search logs..."
                            className="pl-9 md:max-w-sm"
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {activeFilterCount > 0 && (
                            <Badge variant="secondary" className="tabular-nums">
                                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''}
                            </Badge>
                        )}
                        <span className="tabular-nums">{pagination.total} result{pagination.total !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                {/* Drill-down filters */}
                <div className="flex items-center gap-3">
                <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <SearchableSelect
                        value={userId}
                        onValueChange={setUserId}
                        options={userOpts}
                        placeholder="All users"
                        icon={Users}
                    />
                    <SearchableSelect
                        value={clientId}
                        onValueChange={setClientId}
                        options={clientOpts}
                        placeholder="All clients"
                        icon={Boxes}
                    />
                    <SearchableSelect
                        value={event}
                        onValueChange={setEvent}
                        options={eventOpts}
                        placeholder="All actions"
                        icon={Zap}
                    />
                    <SearchableSelect
                        value={source}
                        onValueChange={setSource}
                        options={sourceOpts}
                        placeholder="All sources"
                        icon={Globe}
                    />
                    <SearchableSelect
                        value={subjectType}
                        onValueChange={setSubjectType}
                        options={subjectTypeOpts}
                        placeholder="All entity types"
                        icon={Layers}
                    />
                </div>
                    {activeFilterCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setEvent('');
                                setSource('');
                                setUserId('');
                                setSubjectType('');
                                setClientId('');
                            }}
                        >
                            <X className="mr-1 size-3.5" />
                            Clear filters
                        </Button>
                    )}
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
                                            user_id: userId || undefined,
                                            subject_type: subjectType || undefined,
                                            client_id: clientId || undefined,
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
                                            user_id: userId || undefined,
                                            subject_type: subjectType || undefined,
                                            client_id: clientId || undefined,
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
