import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

export default function ClientsCreate({
    behaviors,
}: {
    behaviors: Array<{ id: number; name: string; slug: string }>;
}) {
    const form = useForm({
        name: '',
        behavior_id: '',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'identity',
            title: 'Create client',
            description:
                'Start with the required client core. The full profile can be completed from the client workspace after creation.',
            fields: [
                {
                    name: 'name',
                    label: 'Name',
                    type: 'text',
                    placeholder: 'Client name',
                    wide: true,
                },
                {
                    name: 'behavior_id',
                    label: 'Behavior',
                    type: 'select',
                    placeholder: 'Normal (default)',
                    options: behaviors.map((behavior) => ({
                        label: behavior.name,
                        value: behavior.id,
                    })),
                },
            ],
        },
    ];

    return (
        <>
            <Head title="Create Client" />
            <CrudPage
                title="Create Client"
                description="Create a client first, then complete the richer profile in the client workspace."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create client"
                    cancelLabel="Back to clients"
                    onCancel={() => router.visit('/clients')}
                    onChange={(name, value) =>
                        form.setData(name as 'name' | 'behavior_id', value)
                    }
                    onSubmit={() => form.post('/clients')}
                />
            </CrudPage>
        </>
    );
}

ClientsCreate.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
