import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientStatusesEdit({
    client,
    status,
}: {
    client: any;
    status: { id: number; name: string; slug: string };
}) {
    const form = useForm({ name: status.name, slug: status.slug });
    const sections: DynamicFormSection[] = [
        {
            name: 'status',
            title: 'Edit status',
            description: 'Update this client-specific status on its own page.',
            fields: [
                {
                    name: 'name',
                    label: 'Name',
                    type: 'text',
                    placeholder: 'Status name',
                },
                {
                    name: 'slug',
                    label: 'Slug',
                    type: 'text',
                    placeholder: 'status-slug',
                },
            ],
        },
    ];

    return (
        <>
            <Head title={`${client.name} Edit Status`} />
            <CrudPage
                title={`Edit ${status.name}`}
                description="Update the status using a dedicated edit page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save status"
                    cancelLabel="Back to statuses"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/statuses`)
                    }
                    onChange={(name, value) =>
                        form.setData(name as 'name' | 'slug', value)
                    }
                    onSubmit={() =>
                        form.put(`/clients/${client.id}/statuses/${status.id}`)
                    }
                />
            </CrudPage>
        </>
    );
}

ClientStatusesEdit.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
