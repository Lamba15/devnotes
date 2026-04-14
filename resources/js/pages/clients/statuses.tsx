import { Head, Link, router } from '@inertiajs/react';
import { Globe, Plus, User } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
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
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedStatusIds, setSelectedStatusIds] = useState<
        Array<string | number>
    >([]);
    const filterDefs: CrudFilterDefinition[] = [
        { key: 'search', type: 'search', placeholder: 'Search statuses...' },
    ];
    const crud = useCrudFilters({
        url: `/clients/${client.id}/statuses`,
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

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
                    {status.client_id ? (
                        <User className="size-3" />
                    ) : (
                        <Globe className="size-3" />
                    )}
                    {status.client_id ? 'Client' : 'System'}
                </Badge>
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
                        <Button asChild>
                            <Link
                                href={`/clients/${client.id}/statuses/create`}
                            >
                                <Plus className="mr-1.5 size-4" />
                                Create status
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <CrudFilters definitions={filterDefs} state={crud}>
                    <SearchableSelect
                        className="md:w-40"
                        size="lg"
                        value={crud.sort.sortBy}
                        isClearable={false}
                        isSearchable={false}
                        onValueChange={(sortBy) =>
                            crud.setSort({
                                sortBy,
                                sortDirection: crud.sort.sortDirection,
                            })
                        }
                        placeholder="Sort by"
                        options={[
                            { value: 'created_at', label: 'Newest' },
                            { value: 'name', label: 'Name' },
                            { value: 'slug', label: 'Slug' },
                        ]}
                    />
                    <SearchableSelect
                        className="md:w-32"
                        size="lg"
                        value={crud.sort.sortDirection}
                        isClearable={false}
                        isSearchable={false}
                        onValueChange={(sortDirection) =>
                            crud.setSort({
                                sortBy: crud.sort.sortBy,
                                sortDirection: sortDirection as 'asc' | 'desc',
                            })
                        }
                        placeholder="Direction"
                        options={[
                            { value: 'desc', label: 'Desc' },
                            { value: 'asc', label: 'Asc' },
                        ]}
                    />
                </CrudFilters>

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
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
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
