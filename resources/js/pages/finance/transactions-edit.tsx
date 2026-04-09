import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormSection } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

export default function FinanceTransactionsEdit({
    transaction,
    projects,
}: {
    transaction: {
        id: number;
        project_id: number;
        description: string;
        amount: string;
        occurred_at: string;
        category: string | null;
        currency: string | null;
    };
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
}) {
    const form = useForm({
        project_id: String(transaction.project_id),
        description: transaction.description ?? '',
        amount: String(transaction.amount ?? ''),
        occurred_at: transaction.occurred_at ?? '',
        category: transaction.category ?? '',
        currency: transaction.currency ?? 'USD',
    });

    const sections: DynamicFormSection[] = [
        {
            name: 'transaction',
            title: 'Edit transaction',
            description: 'Update this transaction on its own page.',
            fields: [
                {
                    name: 'project_id',
                    label: 'Project',
                    type: 'select',
                    wide: true,
                    options: projects.map((project) => ({
                        label: `${project.client.name} / ${project.name}`,
                        value: project.id,
                    })),
                },
                {
                    name: 'description',
                    label: 'Description',
                    type: 'text',
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
                    name: 'occurred_at',
                    label: 'Occurred at',
                    type: 'date',
                },
                {
                    name: 'category',
                    label: 'Category',
                    type: 'text',
                    placeholder: 'e.g. payment, expense, refund',
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
            <Head title="Edit Transaction" />
            <CrudPage
                title="Edit Transaction"
                description="Update the transaction using a dedicated edit page."
            >
                <DynamicForm
                    sections={sections}
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save transaction"
                    cancelLabel="Back to transactions"
                    onCancel={() => router.visit('/finance/transactions')}
                    onChange={(name, value) =>
                        form.setData(
                            name as keyof typeof form.data,
                            value,
                        )
                    }
                    onSubmit={() =>
                        form.put(`/finance/transactions/${transaction.id}`)
                    }
                />
            </CrudPage>
        </>
    );
}

FinanceTransactionsEdit.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
