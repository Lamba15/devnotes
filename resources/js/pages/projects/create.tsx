import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectsCreate({
    client,
    statuses,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    statuses: Array<{ id: number; name: string; slug: string }>;
}) {
    const form = useForm({
        name: '',
        description: '',
        status_id: '',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'project',
            title: 'Create project',
            description:
                'Projects live inside the client workspace and should start with a clear status and scope.',
            fields: [
                {
                    name: 'name',
                    label: 'Name',
                    type: 'text',
                    placeholder: 'Project name',
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
                    name: 'status_id',
                    label: 'Status',
                    type: 'select',
                    placeholder: 'Select status',
                    options: statuses.map((status) => ({
                        label: status.name,
                        value: status.id,
                    })),
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`${client.name} Create Project`} />
            <CrudPage
                title={`Create ${client.name} Project`}
                description="Create a new project inside this client workspace."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create project"
                    cancelLabel="Back to projects"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/projects`)
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as 'name' | 'description' | 'status_id',
                            value,
                        )
                    }
                    onSubmit={() => form.post(`/clients/${client.id}/projects`)}
                />
            </CrudPage>
        </>
    );
}

ProjectsCreate.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
