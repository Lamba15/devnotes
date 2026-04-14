import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

export default function FinanceTransactionsCreate({
    projects,
    category_options,
}: {
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
    category_options: Array<{ label: string; value: string }>;
}) {
    const form = useForm({
        project_id: '',
        description: '',
        amount: '',
        occurred_date: '',
        category: '',
        currency: 'EGP',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'transaction',
            title: 'Create transaction',
            description:
                'Transactions should always be linked to a project and recorded clearly.',
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    placeholder: 'Select project',
                    options: projects.map((project) => ({
                        label: `${project.client.name} / ${project.name}`,
                        value: project.id,
                    })),
                    wide: true,
                },
                {
                    name: 'description',
                    label: 'Description',
                    type: 'textarea',
                    placeholder: 'Transaction description',
                    wide: true,
                },
                {
                    name: 'amount',
                    label: 'Amount',
                    type: 'text',
                    placeholder: '0.00',
                },
                {
                    name: 'occurred_date',
                    label: 'Occurred on',
                    type: 'date',
                },
                {
                    name: 'category',
                    label: 'Category',
                    type: 'select',
                    placeholder: 'Select or create category',
                    creatable: true,
                    options: category_options,
                },
                {
                    name: 'currency',
                    label: 'Currency',
                    type: 'select',
                    placeholder: 'Select or create currency',
                    creatable: true,
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
            <Head title="Create Transaction" />
            <CrudPage
                title="Create Transaction"
                description="Create a project-linked financial transaction."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create transaction"
                    cancelLabel="Back to transactions"
                    onCancel={() => router.visit('/finance/transactions')}
                    onChange={(name, value) =>
                        form.setData(name as keyof typeof form.data, value)
                    }
                    onSubmit={() => form.post('/finance/transactions')}
                />
            </CrudPage>
        </>
    );
}

FinanceTransactionsCreate.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
