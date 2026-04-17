import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientStatusesEdit({
    client,
    status,
}: {
    client: any;
    status: { id: number; name: string; slug: string };
}) {
    const goBack = useBackNavigation(`/clients/${client.id}/statuses`);
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
                    onCancel={goBack}
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
