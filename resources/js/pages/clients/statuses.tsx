import { Head, Link, router } from '@inertiajs/react';
import { Globe, Plus, Search, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
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

type StatusRow = {
    id: number;
    name: string;
    slug: string;
    client_id: number | null;
    is_system: boolean;
};

export default function ClientStatusesPage({
    client,
    statuses,
    filters,
    pagination,
    can_manage_statuses,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    statuses: StatusRow[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    can_manage_statuses: boolean;
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedStatusIds, setSelectedStatusIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                `/clients/${client.id}/statuses`,
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
    }, [client.id, query, sortBy, sortDirection]);

    const columns: DataTableColumn<StatusRow>[] = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            sortKey: 'name',
            render: (status) => status.name,
        },
        {
            key: 'slug',
            header: 'Slug',
            sortable: true,
            sortKey: 'slug',
            render: (status) => status.slug,
        },
        {
            key: 'scope',
            header: 'Scope',
            render: (status) => (
                <Badge variant="outline" className="gap-1">
                    {status.client_id ? <User className="size-3" /> : <Globe className="size-3" />}
                    {status.client_id ? 'Client' : 'System'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (status) => (
                <ActionDropdown
                    items={
                        status.client_id
                            ? [
                                  {
                                      label: 'Edit',
                                      onClick: () =>
                                          router.visit(
                                              `/clients/${client.id}/statuses/${status.id}/edit`,
                                          ),
                                  },
                                  {
                                      label: 'Delete',
                                      destructive: true,
                                      onClick: () => setDeleteIds([status.id]),
                                  },
                              ]
                            : []
                    }
                />
            ),
        },
    ];

    const bulkActions = [
        {
            label: 'Edit selected',
            onClick: () => {
                if (selectedStatusIds.length === 1) {
                    router.visit(
                        `/clients/${client.id}/statuses/${selectedStatusIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete selected',
            destructive: true,
            onClick: () => {
                if (selectedStatusIds.length > 0) {
                    setDeleteIds(selectedStatusIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/clients/${client.id}/statuses/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedStatusIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    const selectableIds = statuses
        .filter((status) => status.client_id)
        .map((status) => status.id);

    return (
        <>
            <Head title={`${client.name} Statuses`} />
            <CrudPage
                title={`${client.name} Statuses`}
                description="Manage the status definitions available in this client workspace."
                actions={
                    can_manage_statuses ? (
                        <Link href={`/clients/${client.id}/statuses/create`}>
                            <Button>
                                <Plus className="mr-1.5 size-4" />
                                Create status
                            </Button>
                        </Link>
                    ) : undefined
                }
            >
                <FilterBar>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative md:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search statuses..."
                                className="pl-9"
                            />
                        </div>
                        <select
                            value={sortBy}
                            onChange={(event) => setSortBy(event.target.value)}
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="created_at">Newest</option>
                            <option value="name">Name</option>
                            <option value="slug">Slug</option>
                        </select>
                        <select
                            value={sortDirection}
                            onChange={(event) =>
                                setSortDirection(event.target.value)
                            }
                            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                        >
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={statuses}
                    emptyText="No statuses available for this client."
                    getRowId={(status) => status.id}
                    selectedRowIds={selectedStatusIds}
                    onSelectedRowIdsChange={(ids) =>
                        setSelectedStatusIds(
                            ids.filter((id) =>
                                selectableIds.includes(Number(id)),
                            ),
                        )
                    }
                    bulkActions={can_manage_statuses ? bulkActions : []}
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
                            `/clients/${client.id}/statuses`,
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
                    open={deleteIds !== null}
                    onOpenChange={(open) => !open && setDeleteIds(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete status
                                {deleteIds?.length === 1 ? '' : 'es'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} client-defined status
                                {deleteIds?.length === 1 ? '' : 'es'}.
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

ClientStatusesPage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
