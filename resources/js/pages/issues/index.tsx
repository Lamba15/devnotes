import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
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
                <Link
                    href={`/clients/${client.id}/projects/${project.id}/issues/${issue.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {issue.title}
                </Link>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (issue) => issue.status,
        },
        {
            key: 'priority',
            header: 'Priority',
            sortable: true,
            sortKey: 'priority',
            render: (issue) => issue.priority,
        },
        {
            key: 'type',
            header: 'Type',
            sortable: true,
            sortKey: 'type',
            render: (issue) => issue.type,
        },
        {
            key: 'assignee',
            header: 'Assignee',
            render: (issue) => issue.assignee?.name ?? 'Unassigned',
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
                        <Link
                            href={`/clients/${client.id}/projects/${project.id}/issues/create`}
                        >
                            <Button>Create issue</Button>
                        </Link>
                    ) : undefined
                }
            >
                <FilterBar>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search issues by title, description, status, priority, or type"
                        className="md:max-w-sm"
                    />
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
        </>
    );
}

IssuesIndex.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
