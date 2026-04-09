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
                    type: 'text',
                    placeholder: 'YYYY-MM-DD',
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
                            name as
                                | 'project_id'
                                | 'description'
                                | 'amount'
                                | 'occurred_at',
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
