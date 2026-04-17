import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import type { ActionDropdownItem } from '@/components/crud/action-dropdown';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
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

type Status = {
    id: number;
    name: string;
    slug: string;
};

type Project = {
    id: number;
    name: string;
    description: string | null;
    image_path: string | null;
    status: Status | null;
    client: {
        id: number;
        name: string;
    } | null;
};

export default function AllProjectsIndex({
    projects,
    filters,
    pagination,
    statuses,
    status_filter_options,
}: {
    projects: Project[];
    filters: {
        search: string;
        sort_by: string;
        sort_direction: string;
        status: string[];
    };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    statuses: Status[];
    status_filter_options: { label: string; value: string }[];
}) {
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [showStatusDialog, setShowStatusDialog] = useState(false);
    const [bulkStatusId, setBulkStatusId] = useState<string>('');

    const filterDefs: CrudFilterDefinition[] = useMemo(
        () => [
            {
                key: 'search',
                type: 'search',
                placeholder: 'Search projects by name, description, or client',
            },
            {
                key: 'status',
                type: 'select',
                placeholder: 'Status',
                options: status_filter_options,
                className: 'lg:w-44',
            },
        ],
        [status_filter_options],
    );

    const crud = useCrudFilters({
        url: '/clients/projects',
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const getProjectUrl = (project: Project) =>
        project.client
            ? `/clients/${project.client.id}/projects/${project.id}`
            : '#';

    const columns: DataTableColumn<Project>[] = [
        {
            key: 'name',
            header: 'Project',
            sortable: true,
            sortKey: 'name',
            render: (project) => (
                <Link
                    href={getProjectUrl(project)}
                    className="flex cursor-pointer items-center gap-2.5 font-medium underline-offset-4 hover:underline"
                >
                    <Avatar className="size-7">
                        {project.image_path ? (
                            <AvatarImage
                                src={`/storage/${project.image_path}`}
                                alt={project.name}
                            />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                            {project.name
                                .split(' ')
                                .map((part) => part[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {project.name}
                </Link>
            ),
        },
        {
            key: 'client',
            header: 'Client',
            sortable: true,
            sortKey: 'client_name',
            render: (project) =>
                project.client ? (
                    <Link
                        href={`/clients/${project.client.id}`}
                        className="cursor-pointer underline-offset-4 hover:underline"
                    >
                        {project.client.name}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (project) =>
                project.status ? (
                    <Badge variant="outline" className="capitalize">
                        {project.status.name}
                    </Badge>
                ) : (
                    '—'
                ),
        },
        {
            key: 'description',
            header: 'Description',
            sortable: true,
            sortKey: 'description',
            render: (project) => project.description ?? '—',
        },
        {
            key: 'actions',
            header: '',
            render: (project) => {
                const items: ActionDropdownItem[] = [
                    {
                        label: 'View',
                        onClick: () => router.visit(getProjectUrl(project)),
                    },
                    {
                        label: 'Edit',
                        onClick: () =>
                            project.client
                                ? router.visit(
                                      `/clients/${project.client.id}/projects/${project.id}/edit`,
                                  )
                                : undefined,
                    },
                    {
                        label: 'Delete',
                        destructive: true,
                        onClick: () => setDeleteIds([project.id]),
                    },
                ];

                return <ActionDropdown items={items} />;
            },
        },
    ];

    const bulkActions = [
        {
            label: 'Change Status',
            disabled: selectedIds.length === 0,
            disabledReason: 'Select at least one project.',
            onClick: () => {
                setBulkStatusId('');
                setShowStatusDialog(true);
            },
        },
        {
            label: 'Edit',
            disabled: selectedIds.length !== 1,
            disabledReason: 'Select exactly one project to edit.',
            onClick: () => {
                if (selectedIds.length === 1) {
                    const project = projects.find(
                        (p) => p.id === selectedIds[0],
                    );

                    if (project?.client) {
                        router.visit(
                            `/clients/${project.client.id}/projects/${project.id}/edit`,
                        );
                    }
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedIds.length > 0) {
                    setDeleteIds(selectedIds);
                }
            },
        },
    ];

    const confirmBulkStatusChange = () => {
        if (!bulkStatusId || selectedIds.length === 0) {
            return;
        }

        router.post(
            '/clients/projects/bulk-status',
            {
                project_ids: selectedIds,
                status_id: Number(bulkStatusId),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowStatusDialog(false);
                    setSelectedIds([]);
                    setBulkStatusId('');
                },
            },
        );
    };

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            const project = projects.find((p) => p.id === id);

            if (project?.client) {
                await router.delete(
                    `/clients/${project.client.id}/projects/${project.id}`,
                    {
                        preserveScroll: true,
                        preserveState: true,
                    },
                );
            }
        }

        setSelectedIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title="Client Projects" />
            <CrudPage
                title="Client Projects"
                description="A platform-wide view of all projects that still belong to individual clients."
            >
                <CrudFilters definitions={filterDefs} state={crud} />

                <DataTable
                    columns={columns}
                    rows={projects}
                    emptyText="No projects yet."
                    getRowId={(project) => project.id}
                    selectedRowIds={selectedIds}
                    onSelectedRowIdsChange={setSelectedIds}
                    bulkActions={bulkActions}
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
                />

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
                            <DialogTitle>Delete project(s)?</DialogTitle>
                            <DialogDescription>
                                This will permanently delete{' '}
                                {deleteIds?.length === 1
                                    ? 'this project'
                                    : `${deleteIds?.length} projects`}{' '}
                                and all associated data. This action cannot be
                                undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setDeleteIds(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={showStatusDialog}
                    onOpenChange={(open) => {
                        if (!open) {
                            setShowStatusDialog(false);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Change status</DialogTitle>
                            <DialogDescription>
                                Update the status of {selectedIds.length}{' '}
                                selected project
                                {selectedIds.length === 1 ? '' : 's'}.
                            </DialogDescription>
                        </DialogHeader>
                        <SearchableSelect
                            options={statuses.map((s) => ({
                                label: s.name,
                                value: String(s.id),
                            }))}
                            value={bulkStatusId}
                            onValueChange={(value: string) =>
                                setBulkStatusId(value)
                            }
                            placeholder="Select status..."
                        />
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setShowStatusDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                disabled={!bulkStatusId}
                                onClick={confirmBulkStatusChange}
                            >
                                Apply
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
        </>
    );
}

AllProjectsIndex.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
