import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

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
    status: Status;
};

export default function ProjectsIndex({
    client,
    projects,
    can_create_projects,
    status_filter_options,
    filters,
    pagination,
}: {
    client: { id: number; name: string };
    projects: Project[];
    can_create_projects: boolean;
    status_filter_options: Array<{ label: string; value: string }>;
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
}) {
    const filterDefs: CrudFilterDefinition[] = useMemo(
        () => [
            {
                key: 'search',
                type: 'search',
                placeholder: 'Search projects...',
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
        url: `/clients/${client.id}/projects`,
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedProjectIds, setSelectedProjectIds] = useState<
        Array<string | number>
    >([]);

    const columns: DataTableColumn<Project>[] = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            sortKey: 'name',
            render: (project) => (
                <Link
                    href={`/clients/${client.id}/projects/${project.id}`}
                    className="flex items-center gap-2.5 font-medium underline-offset-4 hover:underline"
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
            key: 'status',
            header: 'Status',
            render: (project) => (
                <Badge variant="outline" className="capitalize">
                    {project.status.name}
                </Badge>
            ),
        },
        {
            key: 'description',
            header: 'Description',
            sortable: true,
            sortKey: 'description',
            render: (project) => project.description ?? '—',
        },
    ];

    const bulkActions = [
        {
            label: 'Edit',
            disabled: selectedProjectIds.length !== 1,
            disabledReason: 'Select exactly one project to edit.',
            onClick: () => {
                if (selectedProjectIds.length === 1) {
                    window.location.assign(
                        `/clients/${client.id}/projects/${selectedProjectIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedProjectIds.length > 0) {
                    setDeleteIds(selectedProjectIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/clients/${client.id}/projects/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedProjectIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title={`${client.name} Projects`} />
            <CrudPage
                title={`${client.name} Projects`}
                description="Projects are owned by exactly one client in v1."
                actions={
                    can_create_projects ? (
                        <Button asChild>
                            <Link
                                href={`/clients/${client.id}/projects/create`}
                            >
                                <Plus className="mr-1.5 size-4" />
                                Create project
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <CrudFilters definitions={filterDefs} state={crud} />

                <DataTable
                    columns={columns}
                    rows={projects}
                    emptyText="No projects yet."
                    getRowId={(project) => project.id}
                    selectedRowIds={selectedProjectIds}
                    onSelectedRowIdsChange={setSelectedProjectIds}
                    bulkActions={bulkActions}
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
                                Delete project
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} project
                                {deleteIds?.length === 1 ? '' : 's'} from this
                                client workspace.
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

ProjectsIndex.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
