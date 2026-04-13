import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function SecretFormPage({
    title,
    description,
    submitLabel,
    cancelHref,
    submitUrl,
    method,
    initialData,
}: {
    title: string;
    description: string;
    submitLabel: string;
    cancelHref: string;
    submitUrl: string;
    method: 'post' | 'put';
    initialData: {
        label: string;
        description: string;
        secret_value: string;
    };
}) {
    const form = useForm(initialData);

    const sections: DynamicFormSection[] = [
        {
            name: 'secret',
            title,
            description,
            fields: [
                {
                    name: 'label',
                    label: 'Label',
                    type: 'text',
                    placeholder: 'Database password',
                },
                {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    placeholder: 'Optional notes about this secret',
                    wide: true,
                },
                {
                    name: 'secret_value',
                    label: 'Secret value',
                    type: 'textarea',
                    placeholder: 'Enter the secret value',
                    wide: true,
                },
            ],
        },
    ];

    return (
        <>
            <Head title={title} />
            <CrudPage title={title} description={description}>
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel={submitLabel}
                    cancelLabel="Back"
                    onCancel={() => router.visit(cancelHref)}
                    onChange={(name, value) =>
                        form.setData(name as keyof typeof form.data, value)
                    }
                    onSubmit={() => {
                        if (method === 'post') {
                            form.post(submitUrl);
                            return;
                        }

                        form.put(submitUrl);
                    }}
                />
            </CrudPage>
        </>
    );
}

SecretFormPage.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
