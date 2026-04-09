import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ClientStatusesCreate({ client }: { client: any }) {
    const form = useForm({ name: '', slug: '' });
    const sections: DynamicFormSection[] = [
        {
            name: 'status',
            title: 'Create status',
            description: 'Create a client-specific project status.',
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
            <Head title={`${client.name} Create Status`} />
            <CrudPage
                title={`Create ${client.name} Status`}
                description="Create a client-specific status on its own page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create status"
                    cancelLabel="Back to statuses"
                    onCancel={() =>
                        router.visit(`/clients/${client.id}/statuses`)
                    }
                    onChange={(name, value) =>
                        form.setData(name as 'name' | 'slug', value)
                    }
                    onSubmit={() => form.post(`/clients/${client.id}/statuses`)}
                />
            </CrudPage>
        </>
    );
}

ClientStatusesCreate.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
