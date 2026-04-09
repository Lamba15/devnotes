import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectsEdit({
    client,
    project,
    statuses,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    project: {
        id: number;
        name: string;
        description: string | null;
        status_id: number;
        budget: string | null;
        currency: string | null;
    };
    statuses: Array<{ id: number; name: string; slug: string }>;
}) {
    const form = useForm({
        name: project.name ?? '',
        description: project.description ?? '',
        status_id: project.status_id ? String(project.status_id) : '',
        budget: project.budget ?? '',
        currency: project.currency ?? 'USD',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'project',
            title: 'Edit project',
            description:
                'Update this project using the same dedicated edit flow as the rest of the system.',
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
                {
                    name: 'budget',
                    label: 'Budget',
                    type: 'text',
                    placeholder: 'e.g. 5000',
                },
                {
                    name: 'currency',
                    label: 'Currency',
                    type: 'select',
                    options: [
                        { label: 'USD', value: 'USD' },
                        { label: 'EUR', value: 'EUR' },
                        { label: 'GBP', value: 'GBP' },
                        { label: 'EGP', value: 'EGP' },
                        { label: 'SAR', value: 'SAR' },
                        { label: 'AED', value: 'AED' },
                    ],
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`Edit ${project.name}`} />
            <CrudPage
                title={`Edit ${project.name}`}
                description="Edit the project on its own page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save project"
                    cancelLabel="Back to projects"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/projects`)
                    }
                    onChange={(name, value) =>
                        form.setData(
                            name as keyof typeof form.data,
                            value,
                        )
                    }
                    onSubmit={() =>
                        form.put(`/clients/${client.id}/projects/${project.id}`)
                    }
                />
            </CrudPage>
        </>
    );
}

ProjectsEdit.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
