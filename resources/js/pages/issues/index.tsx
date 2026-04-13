import { Head, Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bug,
    CheckCircle2,
    Circle,
    Flame,
    Image as ImageIcon,
    Lightbulb,
    ListTodo,
    Loader2,
    Minus,
    Paperclip,
    Plus,
    Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
import { IssueQuickViewDialog } from '@/components/issues/issue-quick-view-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { stripHtml } from '@/lib/utils';

const statusConfig: Record<string, { icon: typeof Circle; color: string }> = {
    todo: { icon: Circle, color: 'text-muted-foreground' },
    in_progress: { icon: Loader2, color: 'text-blue-500' },
    done: { icon: CheckCircle2, color: 'text-emerald-500' },
};

const priorityConfig: Record<string, { icon: typeof Minus; color: string }> = {
    low: { icon: Minus, color: 'text-muted-foreground' },
    medium: { icon: AlertTriangle, color: 'text-amber-500' },
    high: { icon: Flame, color: 'text-red-500' },
};

const typeConfig: Record<string, { icon: typeof ListTodo; color: string }> = {
    task: { icon: ListTodo, color: 'text-blue-500' },
    bug: { icon: Bug, color: 'text-red-500' },
    feature: { icon: Lightbulb, color: 'text-violet-500' },
};

type IssueCommentPreview = {
    id: number;
    body: string;
    parent_id: number | null;
    created_at?: string;
    user: {
        id: number;
        name: string;
        avatar_path?: string | null;
    } | null;
    replies: IssueCommentPreview[];
};

type Issue = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    assignee: {
        id: number;
        name: string;
    } | null;
    due_date?: string | null;
    estimated_hours?: string | null;
    label?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    attachments: Array<{
        id: number;
        file_name: string;
        file_path?: string | null;
        mime_type: string;
        file_size: number;
        url?: string | null;
        is_image?: boolean;
    }>;
    attachment_count: number;
    image_count: number;
    file_count: number;
    preview_image_url: string | null;
    comments_count: number;
    can_comment: boolean;
    comments: IssueCommentPreview[];
};

export default function IssuesIndex({
    client,
    project,
    issues,
    can_manage_issues,
    filters,
    pagination,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    issues: Issue[];
    can_manage_issues: boolean;
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteMode, setDeleteMode] = useState<
        | { type: 'single'; ids: Array<string | number> }
        | { type: 'bulk'; ids: Array<string | number> }
        | null
    >(null);
    const [selectedIssueIds, setSelectedIssueIds] = useState<
        Array<string | number>
    >([]);
    const [quickViewIssueId, setQuickViewIssueId] = useState<number | null>(
        null,
    );
    const quickViewIssue =
        issues.find((issue) => issue.id === quickViewIssueId) ?? null;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                `/clients/${client.id}/projects/${project.id}/issues`,
                {
                    search: query || undefined,
                    sort_by: sortBy,
                    sort_direction: sortDirection,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [client.id, project.id, query, sortBy, sortDirection]);

    const columns: DataTableColumn<Issue>[] = [
        {
            key: 'title',
            header: 'Title',
            sortable: true,
            sortKey: 'title',
            render: (issue) => (
                <button
                    type="button"
                    className="flex w-full cursor-pointer items-start gap-3 text-left"
                    onClick={() => setQuickViewIssueId(issue.id)}
                >
                    {issue.preview_image_url ? (
                        <img
                            src={issue.preview_image_url}
                            alt={issue.title}
                            className="mt-0.5 size-14 rounded-lg border object-cover"
                        />
                    ) : (
                        <div className="mt-0.5 flex size-14 items-center justify-center rounded-lg border bg-muted/40 text-muted-foreground">
                            <ImageIcon className="size-4" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="font-medium underline-offset-4 hover:underline">
                            {issue.title}
                        </div>
                        {issue.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                {stripHtml(issue.description)}
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">
                                No description yet.
                            </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                            {issue.image_count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                    <ImageIcon className="size-3" />
                                    {issue.image_count}
                                </span>
                            ) : null}
                            {issue.file_count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                    <Paperclip className="size-3" />
                                    {issue.file_count}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </button>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (issue) => {
                const cfg = statusConfig[issue.status] ?? statusConfig.todo;
                const Icon = cfg.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${cfg.color}`} />
                        {issue.status.replace('_', ' ')}
                    </Badge>
                );
            },
        },
        {
            key: 'priority',
            header: 'Priority',
            sortable: true,
            sortKey: 'priority',
            render: (issue) => {
                const cfg =
                    priorityConfig[issue.priority] ?? priorityConfig.medium;
                const Icon = cfg.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${cfg.color}`} />
                        {issue.priority}
                    </Badge>
                );
            },
        },
        {
            key: 'type',
            header: 'Type',
            sortable: true,
            sortKey: 'type',
            render: (issue) => {
                const cfg = typeConfig[issue.type] ?? typeConfig.task;
                const Icon = cfg.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${cfg.color}`} />
                        {issue.type}
                    </Badge>
                );
            },
        },
        {
            key: 'assignee',
            header: 'Assignee',
            render: (issue) => (
                <span
                    className={
                        issue.assignee ? 'font-medium' : 'text-muted-foreground'
                    }
                >
                    {issue.assignee?.name ?? 'Unassigned'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (issue) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open',
                            onClick: () =>
                                window.location.assign(
                                    `/clients/${client.id}/projects/${project.id}/issues/${issue.id}`,
                                ),
                        },
                        {
                            label: 'Edit',
                            onClick: () =>
                                window.location.assign(
                                    `/clients/${client.id}/projects/${project.id}/issues/${issue.id}/edit`,
                                ),
                        },
                        {
                            label: 'Delete',
                            destructive: true,
                            onClick: () =>
                                setDeleteMode({
                                    type: 'single',
                                    ids: [issue.id],
                                }),
                        },
                    ]}
                />
            ),
        },
    ];

    const bulkActions = [
        {
            label: 'Edit selected',
            onClick: () => {
                if (selectedIssueIds.length === 1) {
                    window.location.assign(
                        `/clients/${client.id}/projects/${project.id}/issues/${selectedIssueIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete selected',
            onClick: () => {
                if (selectedIssueIds.length > 0) {
                    setDeleteMode({
                        type: 'bulk',
                        ids: selectedIssueIds,
                    });
                }
            },
            destructive: true,
        },
    ];

    const confirmDelete = async () => {
        if (!deleteMode) {
            return;
        }

        for (const id of deleteMode.ids) {
            await router.delete(
                `/clients/${client.id}/projects/${project.id}/issues/${id}`,
                {
                    preserveScroll: true,
                    preserveState: true,
                },
            );
        }

        setSelectedIssueIds((current) =>
            current.filter((id) => !deleteMode.ids.includes(id)),
        );
        setDeleteMode(null);
    };

    return (
        <>
            <Head title={`${project.name} Issues`} />
            <CrudPage
                title={`${project.name} Issues`}
                description={`${client.name} / ${project.name}`}
                actions={
                    can_manage_issues ? (
                        <Button asChild>
                            <Link
                                href={`/clients/${client.id}/projects/${project.id}/issues/create?return_to=${encodeURIComponent(`/clients/${client.id}/projects/${project.id}/issues`)}`}
                            >
                                <Plus className="mr-1.5 size-4" />
                                Create issue
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <FilterBar>
                    <div className="relative md:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search issues..."
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={issues}
                    emptyText="No issues yet."
                    getRowId={(issue) => issue.id}
                    selectedRowIds={selectedIssueIds}
                    onSelectedRowIdsChange={setSelectedIssueIds}
                    bulkActions={can_manage_issues ? bulkActions : []}
                    currentSort={{
                        sortBy,
                        sortDirection: sortDirection as 'asc' | 'desc',
                    }}
                    onSortChange={(nextSortBy) => {
                        if (sortBy === nextSortBy) {
                            setSortDirection((current) =>
                                current === 'asc' ? 'desc' : 'asc',
                            );
                        } else {
                            setSortBy(nextSortBy);
                            setSortDirection('asc');
                        }
                    }}
                    pagination={pagination}
                    onPageChange={(page) =>
                        router.get(
                            `/clients/${client.id}/projects/${project.id}/issues`,
                            {
                                search: query || undefined,
                                sort_by: sortBy,
                                sort_direction: sortDirection,
                                page,
                            },
                            {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                            },
                        )
                    }
                />

                <Dialog
                    open={deleteMode !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteMode(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete issue
                                {deleteMode?.ids.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteMode?.ids.length ?? 0} issue
                                {deleteMode?.ids.length === 1 ? '' : 's'} from
                                this project.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => void confirmDelete()}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
            <IssueQuickViewDialog
                issue={quickViewIssue}
                open={quickViewIssue !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setQuickViewIssueId(null);
                    }
                }}
                clientId={client.id}
                projectId={project.id}
            />
        </>
    );
}

IssuesIndex.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
