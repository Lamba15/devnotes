import { Head, Link, router } from '@inertiajs/react';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/clients/projects',
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
    }, [query, sortBy, sortDirection]);

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
        {
            key: 'actions',
            header: '',
            render: (project) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open project',
                            onClick: () => {
                                if (project.client) {
                                    router.visit(
                                        `/clients/${project.client.id}/projects/${project.id}`,
                                    );
                                }
                            },
                        },
                        {
                            label: 'Open client',
                            onClick: () => {
                                if (project.client) {
                                    router.visit(`/clients/${project.client.id}`);
                                }
                            },
                        },
                        {
                            label: 'Edit',
                            onClick: () => {
                                if (project.client) {
                                    router.visit(
                                        `/clients/${project.client.id}/projects/${project.id}/edit`,
                                    );
                                }
                            },
                        },
                    ]}
                />
            ),
        },
    ];

    return (
        <>
            <Head title="Client Projects" />
            <CrudPage
                title="Client Projects"
                description="A platform-wide view of all projects that still belong to individual clients."
            >
                <FilterBar>
                    <div className="relative md:max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search projects by name, description, or client"
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={projects}
                    emptyText="No projects yet."
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
                            '/clients/projects',
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
            </CrudPage>
        </>
    );
}

AllProjectsIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
