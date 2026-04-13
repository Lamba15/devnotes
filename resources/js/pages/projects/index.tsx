import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
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
import { Input } from '@/components/ui/input';
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
    filters,
    pagination,
}: {
    client: { id: number; name: string };
    projects: Project[];
    can_create_projects: boolean;
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
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedProjectIds, setSelectedProjectIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                `/clients/${client.id}/projects`,
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
        {
            key: 'actions',
            header: '',
            render: (project) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Edit',
                            onClick: () =>
                                window.location.assign(
                                    `/clients/${client.id}/projects/${project.id}/edit`,
                                ),
                        },
                        {
                            label: 'Delete',
                            destructive: true,
                            onClick: () => setDeleteIds([project.id]),
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
                if (selectedProjectIds.length === 1) {
                    window.location.assign(
                        `/clients/${client.id}/projects/${selectedProjectIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete selected',
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
                        <Link href={`/clients/${client.id}/projects/create`}>
                            <Button>
                                <Plus className="mr-1.5 size-4" />
                                Create project
                            </Button>
                        </Link>
                    ) : undefined
                }
            >
                <FilterBar>
                    <div className="relative md:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search projects..."
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={projects}
                    emptyText="No projects yet."
                    getRowId={(project) => project.id}
                    selectedRowIds={selectedProjectIds}
                    onSelectedRowIdsChange={setSelectedProjectIds}
                    bulkActions={bulkActions}
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
                            `/clients/${client.id}/projects`,
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
