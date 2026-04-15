import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import {
    TransactionFormEditor
    
} from '@/components/finance/transaction-form-editor';
import type {TransactionFormData} from '@/components/finance/transaction-form-editor';
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
    const form = useForm<TransactionFormData>({
        project_id: '',
        description: '',
        amount: '',
        occurred_date: '',
        category: '',
        currency: 'EGP',
    });

    return (
        <>
            <Head title="Create Transaction" />
            <CrudPage
                title="Create Transaction"
                description="Create a project-linked financial transaction."
            >
                <TransactionFormEditor
                    title="Create transaction"
                    description="Record the finance event with the same card-based finance layout used across invoices and transaction detail."
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Create transaction"
                    projects={projects}
                    categoryOptions={category_options}
                    onCancel={() => router.visit('/finance/transactions')}
                    onChange={(data) => form.setData(data)}
                    onSubmit={() => form.post('/finance/transactions')}
                />
            </CrudPage>
        </>
    );
}

FinanceTransactionsCreate.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
