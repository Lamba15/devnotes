import { Head, Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
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
    Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { IssueQuickViewDialog } from '@/components/issues/issue-quick-view-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { stripHtml } from '@/lib/utils';

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

type IssueRow = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    assignee_id?: number | null;
    due_date?: string | null;
    estimated_hours?: string | null;
    label?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    project?: { id: number; name: string } | null;
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

export default function ClientIssuesPage({
    client,
    issues,
    filters,
    project_filter_options,
    status_filter_options,
    priority_filter_options,
    type_filter_options,
    pagination,
    creatable_projects,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    issues: IssueRow[];
    filters: {
        search: string;
        sort_by: string;
        sort_direction: string;
        project_id: string[];
        status: string[];
        priority: string[];
        type: string[];
    };
    project_filter_options: Array<{ label: string; value: string }>;
    status_filter_options: Array<{ label: string; value: string }>;
    priority_filter_options: Array<{ label: string; value: string }>;
    type_filter_options: Array<{ label: string; value: string }>;
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    creatable_projects: Array<{ id: number; name: string }>;
}) {
    const [selectedIssueIds, setSelectedIssueIds] = useState<
        Array<string | number>
    >([]);
    const [quickViewIssueId, setQuickViewIssueId] = useState<number | null>(
        null,
    );
    const quickViewIssue =
        issues.find((issue) => issue.id === quickViewIssueId) ?? null;

    const filterDefs: CrudFilterDefinition[] = [
        { key: 'search', type: 'search', placeholder: 'Search issues...' },
        {
            key: 'project_id',
            type: 'select',
            placeholder: 'Project',
            options: project_filter_options,
            className: 'lg:w-48',
        },
        {
            key: 'status',
            type: 'select',
            placeholder: 'Status',
            options: status_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'priority',
            type: 'select',
            placeholder: 'Priority',
            options: priority_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'type',
            type: 'select',
            placeholder: 'Type',
            options: type_filter_options,
            className: 'lg:w-40',
        },
    ];

    const crud = useCrudFilters({
        url: `/clients/${client.id}/issues`,
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const columns: DataTableColumn<IssueRow>[] = [
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
            key: 'project',
            header: 'Project',
            render: (issue) =>
                issue.project ? (
                    <Link
                        href={`/clients/${client.id}/projects/${issue.project.id}/issues`}
                        className="underline-offset-4 hover:underline"
                    >
                        {issue.project.name}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (issue) => {
                const cfg: Record<
                    string,
                    { icon: typeof Circle; color: string }
                > = {
                    todo: { icon: Circle, color: 'text-muted-foreground' },
                    in_progress: { icon: Loader2, color: 'text-blue-500' },
                    done: { icon: CheckCircle2, color: 'text-emerald-500' },
                };
                const c = cfg[issue.status] ?? cfg.todo;
                const Icon = c.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
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
                const cfg: Record<
                    string,
                    { icon: typeof Minus; color: string }
                > = {
                    low: { icon: Minus, color: 'text-muted-foreground' },
                    medium: { icon: AlertTriangle, color: 'text-amber-500' },
                    high: { icon: Flame, color: 'text-red-500' },
                };
                const c = cfg[issue.priority] ?? cfg.medium;
                const Icon = c.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
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
                const cfg: Record<
                    string,
                    { icon: typeof ListTodo; color: string }
                > = {
                    task: { icon: ListTodo, color: 'text-blue-500' },
                    bug: { icon: Bug, color: 'text-red-500' },
                    feature: { icon: Lightbulb, color: 'text-violet-500' },
                };
                const c = cfg[issue.type] ?? cfg.task;
                const Icon = c.icon;

                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
                        {issue.type}
                    </Badge>
                );
            },
        },
    ];

    return (
        <>
            <Head title={`${client.name} Issues`} />
            <CrudPage
                title={`${client.name} Issues`}
                description="Issues across the client workspace. Project-specific issue detail and discussion still live inside each project."
            >
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="size-5 text-amber-500" />
                            Issues across this client
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This view brings together issues across the client
                        projects. Project-specific issue detail and discussion
                        still live inside each project.
                    </CardContent>
                </Card>

                {creatable_projects.length > 0 ? (
                    <Card className="shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="size-5 text-primary" />
                                Create issue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Start a new issue from here and drop into the
                                right project create flow.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {creatable_projects.map((project) => (
                                    <Button
                                        key={project.id}
                                        asChild
                                        variant="outline"
                                    >
                                        <Link
                                            href={`/clients/${client.id}/projects/${project.id}/issues/create?return_to=${encodeURIComponent(`/clients/${client.id}/issues`)}`}
                                        >
                                            <Plus className="mr-1.5 size-4" />
                                            {project.name}
                                        </Link>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${pagination.total} issue${pagination.total === 1 ? '' : 's'}`}
                />

                <DataTable
                    columns={columns}
                    rows={issues}
                    emptyText="No issues for this client yet."
                    getRowId={(issue) => issue.id}
                    selectedRowIds={selectedIssueIds}
                    onSelectedRowIdsChange={setSelectedIssueIds}
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
                />
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
                projectId={quickViewIssue?.project?.id ?? 0}
            />
        </>
    );
}

ClientIssuesPage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
