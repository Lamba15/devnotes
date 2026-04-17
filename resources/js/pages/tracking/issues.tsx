import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    Bug,
    Building2,
    CheckCircle2,
    Circle,
    Flame,
    FolderKanban,
    Lightbulb,
    ListTodo,
    Loader2,
    MessageSquare,
    Minus,
    Paperclip,
    Tag,
    User as UserIcon,
    UserMinus,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { IssueDueDate } from '@/components/issues/issue-due-date';
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
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import AppLayout from '@/layouts/app-layout';
import { formatDetailedTimestamp, formatRelativeInstant } from '@/lib/datetime';
import { stripHtml } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

type FilterOption = { label: string; value: string; count?: number };
type ProjectFilterOption = FilterOption & { client_id?: string };

type Person = { id: number; name: string; avatar_path?: string | null };

type IssueAttachment = {
    id?: number;
    file_name: string;
    file_path?: string | null;
    mime_type: string;
    file_size: number;
    url?: string | null;
    is_image?: boolean;
};

type IssueCommentPreview = {
    id: number;
    body: string;
    parent_id: number | null;
    created_at?: string;
    user: Person | null;
    attachments?: IssueAttachment[];
    replies: IssueCommentPreview[];
};

type IssueRow = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    label: string | null;
    assignee_id: number | null;
    due_date: string | null;
    estimated_hours: string | null;
    created_at: string | null;
    updated_at: string | null;
    comments_count: number;
    attachment_count: number;
    attachments_count: number;
    image_count: number;
    file_count: number;
    preview_image_url: string | null;
    attachments: IssueAttachment[];
    comments: IssueCommentPreview[];
    can_comment: boolean;
    assignee: Person | null;
    creator: Person | null;
    project: { id: number; name: string } | null;
    client: { id: number; name: string } | null;
    show_url: string | null;
    edit_url: string | null;
    can_manage: boolean;
    can_manage_issue: boolean;
};

type Filters = {
    search: string;
    sort_by: string;
    sort_direction: 'asc' | 'desc';
    client_id: string[];
    project_id: string[];
    creator_id: string[];
    status: string[];
    priority: string[];
    type: string[];
    assignee: string[];
    label: string[];
    due_date_from: string;
    due_date_to: string;
    created_from: string;
    created_to: string;
    has_attachments: string;
    has_comments: string;
};

type Props = {
    issues: IssueRow[];
    filters: Filters;
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    client_filter_options: FilterOption[];
    project_filter_options: ProjectFilterOption[];
    status_filter_options: FilterOption[];
    priority_filter_options: FilterOption[];
    type_filter_options: FilterOption[];
    assignee_filter_options: FilterOption[];
    creator_filter_options: FilterOption[];
    label_filter_options: FilterOption[];
};

// ─── Column configs (status / priority / type icon maps) ─────────────────────

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

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TrackingIssuesPage({
    issues,
    filters,
    pagination,
    client_filter_options,
    project_filter_options,
    status_filter_options,
    priority_filter_options,
    type_filter_options,
    assignee_filter_options,
    creator_filter_options,
    label_filter_options,
}: Props) {
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [quickViewIssueId, setQuickViewIssueId] = useState<number | null>(
        null,
    );
    const quickViewIssue =
        issues.find((i) => i.id === quickViewIssueId) ?? null;
    const [statusDialogOpen, setStatusDialogOpen] = useState(false);
    const [priorityDialogOpen, setPriorityDialogOpen] = useState(false);
    const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkPriority, setBulkPriority] = useState('');
    const [bulkAssignee, setBulkAssignee] = useState('');

    const availableProjectOptions = useMemo<ProjectFilterOption[]>(() => {
        if (filters.client_id.length === 0) {
            return project_filter_options;
        }

        return project_filter_options.filter(
            (option) =>
                option.client_id !== undefined &&
                filters.client_id.includes(option.client_id),
        );
    }, [project_filter_options, filters.client_id]);

    const hasAttachmentsOptions: FilterOption[] = [
        { label: 'With attachments', value: 'yes' },
        { label: 'Without attachments', value: 'no' },
    ];
    const hasCommentsOptions: FilterOption[] = [
        { label: 'With comments', value: 'yes' },
        { label: 'Without comments', value: 'no' },
    ];

    const filterDefs: CrudFilterDefinition[] = [
        {
            key: 'search',
            type: 'search',
            placeholder: 'Search title, description, assignee, client...',
        },
        {
            key: 'client_id',
            type: 'select',
            placeholder: 'Client',
            icon: Building2,
            options: client_filter_options,
            className: 'lg:w-48',
        },
        {
            key: 'project_id',
            type: 'select',
            placeholder: 'Project',
            icon: FolderKanban,
            options: availableProjectOptions,
            className: 'lg:w-56',
        },
        {
            key: 'status',
            type: 'select',
            placeholder: 'Status',
            icon: Circle,
            options: status_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'priority',
            type: 'select',
            placeholder: 'Priority',
            icon: Flame,
            options: priority_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'type',
            type: 'select',
            placeholder: 'Type',
            icon: Tag,
            options: type_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'assignee',
            type: 'select',
            placeholder: 'Assignee',
            icon: UserIcon,
            options: assignee_filter_options,
            className: 'lg:w-44',
        },
        {
            key: 'creator_id',
            type: 'select',
            placeholder: 'Created by',
            icon: UserIcon,
            options: creator_filter_options,
            className: 'lg:w-44',
        },
        {
            key: 'label',
            type: 'select',
            placeholder: 'Label',
            icon: Tag,
            options: label_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'has_attachments',
            type: 'select',
            placeholder: 'Attachments',
            icon: Paperclip,
            multi: false,
            options: hasAttachmentsOptions,
            className: 'lg:w-44',
        },
        {
            key: 'has_comments',
            type: 'select',
            placeholder: 'Comments',
            icon: MessageSquare,
            multi: false,
            options: hasCommentsOptions,
            className: 'lg:w-44',
        },
        { key: 'due_date_from', type: 'date', placeholder: 'Due from' },
        { key: 'due_date_to', type: 'date', placeholder: 'Due to' },
        { key: 'created_from', type: 'date', placeholder: 'Created from' },
        { key: 'created_to', type: 'date', placeholder: 'Created to' },
    ];

    const crud = useCrudFilters({
        url: '/tracking/issues',
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    // ─── Columns ─────────────────────────────────────────────────────────────

    const columns: DataTableColumn<IssueRow>[] = [
        {
            key: 'title',
            header: 'Title',
            sortable: true,
            sortKey: 'title',
            render: (issue) => (
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        {issue.project ? (
                            <button
                                type="button"
                                className="cursor-pointer text-left font-medium underline-offset-4 hover:underline"
                                onClick={() => setQuickViewIssueId(issue.id)}
                            >
                                {issue.title}
                            </button>
                        ) : (
                            <span className="font-medium text-muted-foreground">
                                {issue.title}
                            </span>
                        )}
                        {issue.description ? (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                {stripHtml(issue.description)}
                            </p>
                        ) : null}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {issue.label ? (
                                <Badge variant="secondary" className="gap-1">
                                    <Tag className="size-3" />
                                    {issue.label}
                                </Badge>
                            ) : null}
                            {issue.attachments_count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                    <Paperclip className="size-3" />
                                    {issue.attachments_count}
                                </span>
                            ) : null}
                            {issue.comments_count > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                    <MessageSquare className="size-3" />
                                    {issue.comments_count}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'client_project',
            header: 'Client / Project',
            className: 'hidden md:table-cell',
            render: (issue) => {
                if (!issue.client || !issue.project) {
                    return <span>—</span>;
                }

                return (
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs text-muted-foreground">
                            {issue.client.name}
                        </span>
                        <span className="truncate text-sm font-medium">
                            {issue.project.name}
                        </span>
                    </div>
                );
            },
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
            className: 'hidden md:table-cell',
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
            className: 'hidden lg:table-cell',
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
            className: 'hidden md:table-cell',
            render: (issue) =>
                issue.assignee ? (
                    <div className="flex items-center gap-2">
                        {issue.assignee.avatar_path ? (
                            <img
                                src={issue.assignee.avatar_path}
                                alt={issue.assignee.name}
                                className="size-6 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                                {issue.assignee.name.charAt(0)}
                            </div>
                        )}
                        <span className="truncate text-sm">
                            {issue.assignee.name}
                        </span>
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                        <UserMinus className="size-3.5" />
                        Unassigned
                    </span>
                ),
        },
        {
            key: 'due_date',
            header: 'Due',
            sortable: true,
            sortKey: 'due_date',
            render: (issue) =>
                issue.due_date ? (
                    <IssueDueDate value={issue.due_date} />
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
        {
            key: 'updated_at',
            header: 'Updated',
            sortable: true,
            sortKey: 'updated_at',
            className: 'hidden lg:table-cell',
            render: (issue) => (
                <span
                    className="text-xs text-muted-foreground"
                    title={
                        issue.updated_at
                            ? formatDetailedTimestamp(issue.updated_at)
                            : undefined
                    }
                >
                    {formatRelativeInstant(issue.updated_at)}
                </span>
            ),
        },
    ];

    // ─── Bulk actions ────────────────────────────────────────────────────────

    const selectedRows = issues.filter((i) => selectedIds.includes(i.id));
    const anyUnmanageable = selectedRows.some((i) => !i.can_manage);

    const bulkActions = [
        {
            label: 'Edit',
            disabled: selectedIds.length !== 1,
            disabledReason: 'Select exactly one issue to edit.',
            onClick: () => {
                const issue = selectedRows[0];

                if (issue?.edit_url) {
                    window.location.assign(
                        `${issue.edit_url}?return_to=${encodeURIComponent('/tracking/issues')}`,
                    );
                }
            },
        },
        {
            label: 'Change status',
            disabled: selectedIds.length === 0 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to update one or more selected issues.'
                : 'Select one or more issues.',
            onClick: () => {
                setBulkStatus('');
                setStatusDialogOpen(true);
            },
        },
        {
            label: 'Reassign',
            disabled: selectedIds.length === 0 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to update one or more selected issues.'
                : 'Select one or more issues.',
            onClick: () => {
                setBulkAssignee('');
                setAssigneeDialogOpen(true);
            },
        },
        {
            label: 'Set priority',
            disabled: selectedIds.length === 0 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to update one or more selected issues.'
                : 'Select one or more issues.',
            onClick: () => {
                setBulkPriority('');
                setPriorityDialogOpen(true);
            },
        },
        {
            label: 'Delete',
            destructive: true,
            disabled: selectedIds.length === 0 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to delete one or more selected issues.'
                : 'Select one or more issues.',
            onClick: () => setDeleteIds(selectedIds),
        },
    ];

    const submitBulkUpdate = (payload: Record<string, unknown>) => {
        router.post(
            '/tracking/issues/bulk-update',
            { issue_ids: selectedIds, ...payload },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedIds([]);
                    setStatusDialogOpen(false);
                    setPriorityDialogOpen(false);
                    setAssigneeDialogOpen(false);
                },
            },
        );
    };

    const confirmDelete = () => {
        if (!deleteIds || deleteIds.length === 0) {
            return;
        }

        router.delete('/tracking/issues/bulk-delete', {
            data: { issue_ids: deleteIds },
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds([]);
                setDeleteIds(null);
            },
        });
    };

    // ─── Empty state copy ────────────────────────────────────────────────────

    const emptyText: React.ReactNode =
        crud.hasActiveFilters || (crud.filters.search as string)?.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                    No issues match these filters.
                </p>
                <Button variant="link" size="sm" onClick={crud.clearFilters}>
                    Clear filters
                </Button>
            </div>
        ) : (
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground">
                    No issues across your projects yet.
                </p>
                <p className="text-xs text-muted-foreground">
                    Issues created in any project will surface here for
                    cross-project triage.
                </p>
            </div>
        );

    return (
        <>
            <Head title="Tracking Issues" />
            <CrudPage
                title="Tracking Issues"
                description="Cross-project issue aggregation across all clients and projects."
            >
                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${pagination.total} issue${pagination.total === 1 ? '' : 's'}`}
                />

                <DataTable
                    columns={columns}
                    rows={issues}
                    emptyText={emptyText}
                    getRowId={(issue) => issue.id}
                    selectedRowIds={selectedIds}
                    onSelectedRowIdsChange={setSelectedIds}
                    bulkActions={bulkActions}
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
                />

                {/* Delete confirmation */}
                <Dialog
                    open={deleteIds !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteIds(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete issue
                                {deleteIds && deleteIds.length === 1 ? '' : 's'}
                                ?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} issue
                                {deleteIds && deleteIds.length === 1
                                    ? ''
                                    : 's'}{' '}
                                across all affected projects. This cannot be
                                undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Change status */}
                <Dialog
                    open={statusDialogOpen}
                    onOpenChange={setStatusDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Change status for {selectedIds.length} issue
                                {selectedIds.length === 1 ? '' : 's'}
                            </DialogTitle>
                            <DialogDescription>
                                All selected issues will be set to the chosen
                                status.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-2">
                            <SearchableSelect
                                options={status_filter_options}
                                value={bulkStatus}
                                onValueChange={setBulkStatus}
                                placeholder="Select status..."
                                isCreatable
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={() =>
                                    submitBulkUpdate({ status: bulkStatus })
                                }
                                disabled={bulkStatus === ''}
                            >
                                Apply
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Set priority */}
                <Dialog
                    open={priorityDialogOpen}
                    onOpenChange={setPriorityDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Set priority for {selectedIds.length} issue
                                {selectedIds.length === 1 ? '' : 's'}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="py-2">
                            <SearchableSelect
                                options={priority_filter_options}
                                value={bulkPriority}
                                onValueChange={setBulkPriority}
                                placeholder="Select priority..."
                                isCreatable
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={() =>
                                    submitBulkUpdate({
                                        priority: bulkPriority,
                                    })
                                }
                                disabled={bulkPriority === ''}
                            >
                                Apply
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Reassign */}
                <Dialog
                    open={assigneeDialogOpen}
                    onOpenChange={setAssigneeDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Reassign {selectedIds.length} issue
                                {selectedIds.length === 1 ? '' : 's'}
                            </DialogTitle>
                            <DialogDescription>
                                Pick a user or choose "Unassigned".
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-2">
                            <SearchableSelect
                                options={assignee_filter_options}
                                value={bulkAssignee}
                                onValueChange={setBulkAssignee}
                                placeholder="Select assignee..."
                            />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={() =>
                                    submitBulkUpdate({
                                        assignee_id: bulkAssignee,
                                    })
                                }
                                disabled={bulkAssignee === ''}
                            >
                                Apply
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
                clientId={quickViewIssue?.client?.id ?? 0}
                projectId={quickViewIssue?.project?.id ?? 0}
                canManageIssue={Boolean(quickViewIssue?.can_manage_issue)}
            />
        </>
    );
}

TrackingIssuesPage.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
