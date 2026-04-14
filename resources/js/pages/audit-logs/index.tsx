import { Head, usePage } from '@inertiajs/react';
import {
    Activity,
    Bot,
    Boxes,
    Clock,
    Globe,
    Layers,
    User,
    Users,
    Zap,
} from 'lucide-react';
import { useMemo } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import AppLayout from '@/layouts/app-layout';
import { formatDetailedTimestamp } from '@/lib/datetime';
import type { Auth } from '@/types';

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
        event: string[];
        source: string[];
        user_id: string[];
        subject_type: string[];
        client_id: string[];
    };
    event_options: string[];
    source_options: string[];
    user_options: FilterOption[];
    subject_type_options: SubjectTypeOption[];
    client_options: FilterOption[];
}) {
    const { auth } = usePage<{ auth: Auth }>().props;

    // Normalize server option formats into {label, value} for the hook
    const eventOpts = useMemo(
        () =>
            event_options
                .filter(Boolean)
                .map((e) => ({ value: e, label: e })),
        [event_options],
    );
    const sourceOpts = useMemo(
        () =>
            source_options
                .filter(Boolean)
                .map((s) => ({ value: s, label: s })),
        [source_options],
    );
    const userOpts = useMemo(
        () =>
            user_options.map((u) => ({
                value: String(u.id),
                label: u.name,
            })),
        [user_options],
    );
    const subjectTypeOpts = useMemo(
        () =>
            subject_type_options.map((t) => ({
                value: t.value,
                label: t.label,
            })),
        [subject_type_options],
    );
    const clientOpts = useMemo(
        () =>
            client_options.map((c) => ({
                value: String(c.id),
                label: c.name,
            })),
        [client_options],
    );

    const filterDefs: CrudFilterDefinition[] = useMemo(
        () => [
            { key: 'search', type: 'search', placeholder: 'Search logs...' },
            {
                key: 'user_id',
                type: 'select',
                placeholder: 'All users',
                options: userOpts,
                icon: Users,
            },
            {
                key: 'client_id',
                type: 'select',
                placeholder: 'All clients',
                options: clientOpts,
                icon: Boxes,
            },
            {
                key: 'event',
                type: 'select',
                placeholder: 'All actions',
                options: eventOpts,
                icon: Zap,
            },
            {
                key: 'source',
                type: 'select',
                placeholder: 'All sources',
                options: sourceOpts,
                icon: Globe,
            },
            {
                key: 'subject_type',
                type: 'select',
                placeholder: 'All entity types',
                options: subjectTypeOpts,
                icon: Layers,
            },
        ],
        [userOpts, clientOpts, eventOpts, sourceOpts, subjectTypeOpts],
    );

    const crud = useCrudFilters({
        url: '/audit-logs',
        definitions: filterDefs,
        initialFilters: filters,
    });

    return (
        <>
            <Head title="Audit Logs" />
            <CrudPage
                title="Audit Logs"
                description="Track all user and system actions across the platform."
            >
                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${pagination.total} result${pagination.total !== 1 ? 's' : ''}`}
                />

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
                                                    {log.user?.name ?? 'System'}
                                                </span>
                                                <Clock className="ml-2 size-3" />
                                                <span>
                                                    {formatDetailedTimestamp(
                                                        log.created_at,
                                                        {
                                                            timeZone:
                                                                auth.user
                                                                    .timezone,
                                                        },
                                                    )}
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
                                    crud.visitPage(pagination.current_page - 1)
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
                                    crud.visitPage(pagination.current_page + 1)
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
