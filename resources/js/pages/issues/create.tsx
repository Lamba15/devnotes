import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function IssuesCreate({
    client,
    project,
    assignee_options,
    status_options,
    priority_options,
    type_options,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    assignee_options: Array<{ label: string; value: string }>;
    status_options: string[];
    priority_options: string[];
    type_options: string[];
}) {
    const form = useForm({
        title: '',
        description: '',
        assignee_id: '',
        status: 'todo',
        priority: 'medium',
        type: 'task',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'issue',
            title: 'Create issue',
            description:
                'Create an issue on its own page instead of mixing forms into the issue list.',
            fields: [
                {
                    name: 'title',
                    label: 'Title',
                    type: 'text',
                    placeholder: 'Issue title',
                    wide: true,
                },
                {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    placeholder: 'Optional description',
                    wide: true,
                },
                {
                    name: 'assignee_id',
                    label: 'Assignee',
                    type: 'select',
                    options: assignee_options,
                },
                {
                    name: 'status',
                    label: 'Status',
                    type: 'select',
                    options: status_options.map((status) => ({
                        label: status,
                        value: status,
                    })),
                },
                {
                    name: 'priority',
                    label: 'Priority',
                    type: 'select',
                    options: priority_options.map((priority) => ({
                        label: priority,
                        value: priority,
                    })),
                },
                {
                    name: 'type',
                    label: 'Type',
                    type: 'select',
                    options: type_options.map((type) => ({
                        label: type,
                        value: type,
                    })),
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`Create Issue`} />
            <CrudPage
                title={`Create Issue`}
                description={`${client.name} / ${project.name}`}
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create issue"
                    cancelLabel="Back to issues"
                    onCancel={() =>
                        router.visit(
                            `/clients/${client.id}/projects/${project.id}/issues`,
                        )
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as
                                | 'title'
                                | 'description'
                                | 'assignee_id'
                                | 'status'
                                | 'priority'
                                | 'type',
                            value,
                        )
                    }
                    onSubmit={() =>
                        form.post(
                            `/clients/${client.id}/projects/${project.id}/issues`,
                        )
                    }
                />
            </CrudPage>
        </>
    );
}

IssuesCreate.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
