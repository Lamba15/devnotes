import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
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
    status: Status;
};

export default function ProjectsIndex({
    client,
    projects,
    statuses,
    can_create_projects,
}: {
    client: { id: number; name: string };
    projects: Project[];
    statuses: Status[];
    can_create_projects: boolean;
}) {
    const form = useForm({
        name: '',
        description: '',
        status_id: '',
    });

    const fields: DynamicFormField[] = [
        { name: 'name', label: 'Name', type: 'text', placeholder: 'Project name' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
        {
            name: 'status_id',
            label: 'Status',
            type: 'select',
            placeholder: 'Select status',
            options: statuses.map((status) => ({ label: status.name, value: status.id })),
        },
    ];

    const columns: DataTableColumn<Project>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (project) => project.name,
        },
        {
            key: 'status',
            header: 'Status',
            render: (project) => project.status.name,
        },
        {
            key: 'description',
            header: 'Description',
            render: (project) => project.description ?? '—',
        },
    ];

    return (
        <>
            <Head title={`${client.name} Projects`} />
            <CrudPage
                title={`${client.name} Projects`}
                description="Projects are owned by exactly one client in v1."
            >
                {can_create_projects ? (
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <DynamicForm
                            fields={fields}
                            data={form.data}
                            errors={form.errors}
                            processing={form.processing}
                            submitLabel="Create project"
                            onChange={(name, value) =>
                                form.setData(name as 'name' | 'description' | 'status_id', value)
                            }
                            onSubmit={() => form.post(`/clients/${client.id}/projects`)}
                        />
                    </section>
                ) : null}

                <DataTable columns={columns} rows={projects} emptyText="No projects yet." />
            </CrudPage>
        </>
    );
}

ProjectsIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
