import { Head, Link, router } from '@inertiajs/react';
import { useMemo } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
}: {
    projects: Project[];
    filters: { search: string; sort_by: string; sort_direction: string };
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
                placeholder: 'Search projects by name, description, or client',
            },
        ],
        [],
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

    const columns: DataTableColumn<Project>[] = [
        {
            key: 'name',
            header: 'Project',
            sortable: true,
            sortKey: 'name',
            render: (project) =>
                project.client ? (
                    <Link
                        href={`/clients/${project.client.id}/projects/${project.id}`}
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
                ) : (
                    project.name
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
                        className="underline-offset-4 hover:underline"
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
    ];

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
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
                />
            </CrudPage>
        </>
    );
}

AllProjectsIndex.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
