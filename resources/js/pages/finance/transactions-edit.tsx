import { Head, router, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import {
    TransactionFormEditor
    
} from '@/components/finance/transaction-form-editor';
import type {TransactionFormData} from '@/components/finance/transaction-form-editor';
import AppLayout from '@/layouts/app-layout';

export default function FinanceTransactionsEdit({
    transaction,
    projects,
    category_options,
}: {
    transaction: {
        id: number;
        project_id: number;
        description: string;
        amount: string;
        occurred_date: string;
        category: string | null;
        currency: string | null;
    };
    projects: Array<{
        id: number;
        name: string;
        client: { id: number; name: string };
    }>;
    category_options: Array<{ label: string; value: string }>;
}) {
    const form = useForm<TransactionFormData>({
        project_id: String(transaction.project_id),
        description: transaction.description ?? '',
        amount: String(transaction.amount ?? ''),
        occurred_date: transaction.occurred_date ?? '',
        category: transaction.category ?? '',
        currency: transaction.currency ?? 'EGP',
    });

    return (
        <>
            <Head title="Edit Transaction" />
            <CrudPage
                title="Edit Transaction"
                description="Update the transaction using a dedicated edit page."
            >
                <TransactionFormEditor
                    title="Edit transaction"
                    description="Keep the transaction aligned with the shared finance presentation, amount treatment, and project context."
                    data={form.data}
                    errors={form.errors}
                    processing={form.processing}
                    submitLabel="Save transaction"
                    projects={projects}
                    categoryOptions={category_options}
                    onCancel={() =>
                        router.visit(`/finance/transactions/${transaction.id}`)
                    }
                    onChange={(data) => form.setData(data)}
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
