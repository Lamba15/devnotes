import { Head, useForm } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { DynamicForm } from '@/components/crud/dynamic-form';
import type { DynamicFormField } from '@/components/crud/dynamic-form';
import AppLayout from '@/layouts/app-layout';

type Client = {
    id: number;
    name: string;
};

type Project = {
    id: number;
    name: string;
    client: Client;
};

type Transaction = {
    id: number;
    description: string;
    amount: string;
    occurred_at: string;
    project: Project;
};

type Invoice = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    issued_at: string | null;
    due_at: string | null;
    paid_at: string | null;
    project: Project;
};

export default function FinanceIndex({
    projects,
    transactions,
    invoices,
}: {
    projects: Project[];
    transactions: Transaction[];
    invoices: Invoice[];
}) {
    const transactionForm = useForm({
        project_id: '',
        description: '',
        amount: '',
        occurred_at: '',
    });

    const invoiceForm = useForm({
        project_id: '',
        reference: '',
        status: '',
        amount: '',
        issued_at: '',
        due_at: '',
        paid_at: '',
        notes: '',
    });

    const projectOptions = projects.map((project) => ({
        label: `${project.client.name} / ${project.name}`,
        value: project.id,
    }));

    const transactionFields: DynamicFormField[] = [
        {
            name: 'project_id',
            label: 'Project',
            type: 'select',
            placeholder: 'Select project',
            options: projectOptions,
        },
        { name: 'description', label: 'Description', type: 'text', placeholder: 'Transaction description' },
        { name: 'amount', label: 'Amount', type: 'text', placeholder: '0.00' },
        { name: 'occurred_at', label: 'Occurred at', type: 'text', placeholder: 'YYYY-MM-DD' },
    ];

    const invoiceFields: DynamicFormField[] = [
        {
            name: 'project_id',
            label: 'Project',
            type: 'select',
            placeholder: 'Select project',
            options: projectOptions,
        },
        { name: 'reference', label: 'Reference', type: 'text', placeholder: 'Invoice reference' },
        { name: 'status', label: 'Status', type: 'text', placeholder: 'draft, sent, paid...' },
        { name: 'amount', label: 'Amount', type: 'text', placeholder: '0.00' },
        { name: 'issued_at', label: 'Issued at', type: 'text', placeholder: 'YYYY-MM-DD' },
        { name: 'due_at', label: 'Due at', type: 'text', placeholder: 'YYYY-MM-DD' },
        { name: 'paid_at', label: 'Paid at', type: 'text', placeholder: 'YYYY-MM-DD' },
        { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Optional notes' },
    ];

    const transactionColumns: DataTableColumn<Transaction>[] = [
        {
            key: 'description',
            header: 'Description',
            render: (transaction) => transaction.description,
        },
        {
            key: 'project',
            header: 'Project',
            render: (transaction) => `${transaction.project.client.name} / ${transaction.project.name}`,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (transaction) => transaction.amount,
        },
        {
            key: 'occurred_at',
            header: 'Occurred',
            render: (transaction) => transaction.occurred_at,
        },
    ];

    const invoiceColumns: DataTableColumn<Invoice>[] = [
        {
            key: 'reference',
            header: 'Reference',
            render: (invoice) => invoice.reference,
        },
        {
            key: 'project',
            header: 'Project',
            render: (invoice) => `${invoice.project.client.name} / ${invoice.project.name}`,
        },
        {
            key: 'status',
            header: 'Status',
            render: (invoice) => invoice.status,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (invoice) => invoice.amount,
        },
    ];

    return (
        <>
            <Head title="Finance" />
            <CrudPage
                title="Finance"
                description="Transactions and invoices are linked to projects in the current v1 foundation."
            >
                <div className="grid gap-6 xl:grid-cols-2">
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <h2 className="mb-4 text-lg font-semibold">New transaction</h2>
                        <DynamicForm
                            fields={transactionFields}
                            data={transactionForm.data}
                            errors={transactionForm.errors}
                            processing={transactionForm.processing}
                            submitLabel="Create transaction"
                            onChange={(name, value) =>
                                transactionForm.setData(
                                    name as 'project_id' | 'description' | 'amount' | 'occurred_at',
                                    value,
                                )
                            }
                            onSubmit={() => transactionForm.post('/finance/transactions')}
                        />
                    </section>

                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <h2 className="mb-4 text-lg font-semibold">New invoice</h2>
                        <DynamicForm
                            fields={invoiceFields}
                            data={invoiceForm.data}
                            errors={invoiceForm.errors}
                            processing={invoiceForm.processing}
                            submitLabel="Create invoice"
                            onChange={(name, value) =>
                                invoiceForm.setData(
                                    name as
                                        | 'project_id'
                                        | 'reference'
                                        | 'status'
                                        | 'amount'
                                        | 'issued_at'
                                        | 'due_at'
                                        | 'paid_at'
                                        | 'notes',
                                    value,
                                )
                            }
                            onSubmit={() => invoiceForm.post('/finance/invoices')}
                        />
                    </section>
                </div>

                <section className="grid gap-6">
                    <div className="grid gap-4">
                        <h2 className="text-lg font-semibold">Transactions</h2>
                        <DataTable columns={transactionColumns} rows={transactions} emptyText="No transactions yet." />
                    </div>

                    <div className="grid gap-4">
                        <h2 className="text-lg font-semibold">Invoices</h2>
                        <DataTable columns={invoiceColumns} rows={invoices} emptyText="No invoices yet." />
                    </div>
                </section>
            </CrudPage>
        </>
    );
}

FinanceIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
