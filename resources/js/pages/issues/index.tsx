import { Head, Link, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

type Issue = {
    id: number;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
};

export default function IssuesIndex({
    client,
    project,
    issues,
    can_manage_issues,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    issues: Issue[];
    can_manage_issues: boolean;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const form = useForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        type: 'task',
    });

    const fields: DynamicFormField[] = [
        { name: 'title', label: 'Title', type: 'text', placeholder: 'Issue title' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional description' },
        {
            name: 'status',
            label: 'Status',
            type: 'select',
            options: status_options.map((status) => ({ label: status, value: status })),
        },
        {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            options: priority_options.map((priority) => ({ label: priority, value: priority })),
        },
        {
            name: 'type',
            label: 'Type',
            type: 'select',
            options: type_options.map((type) => ({ label: type, value: type })),
        },
    ];

    const columns: DataTableColumn<Issue>[] = [
        {
            key: 'title',
            header: 'Title',
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
            render: (issue) => issue.status,
        },
        {
            key: 'priority',
            header: 'Priority',
            render: (issue) => issue.priority,
        },
        {
            key: 'type',
            header: 'Type',
            render: (issue) => issue.type,
        },
    ];

    return (
        <>
            <Head title={`${project.name} Issues`} />
            <CrudPage title={`${project.name} Issues`} description={`${client.name} / ${project.name}`}>
                {can_manage_issues ? (
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <DynamicForm
                            fields={fields}
                            data={form.data}
                            errors={form.errors}
                            processing={form.processing}
                            submitLabel="Create issue"
                            onChange={(name, value) =>
                                form.setData(name as 'title' | 'description' | 'status' | 'priority' | 'type', value)
                            }
                            onSubmit={() => form.post(`/clients/${client.id}/projects/${project.id}/issues`)}
                        />
                    </section>
                ) : null}

                <DataTable columns={columns} rows={issues} emptyText="No issues yet." />
            </CrudPage>
        </>
    );
}

IssuesIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
