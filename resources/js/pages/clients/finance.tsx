import { Head, Link } from '@inertiajs/react';
import { FileText, Receipt } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { Button } from '@/components/ui/button';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDateOnly } from '@/lib/datetime';

type TransactionRow = {
    id: number;
    description: string;
    amount: string;
    currency: string | null;
    occurred_date: string | null;
    category: string | null;
    project?: { id: number; name: string } | null;
};

type InvoiceRow = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    currency: string | null;
    issued_at: string | null;
    due_at: string | null;
    paid_at: string | null;
    project?: { id: number; name: string } | null;
};

export default function ClientFinancePage({
    client,
    filters,
    transactions,
    invoices,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    filters: { search: string };
    transactions: TransactionRow[];
    invoices: InvoiceRow[];
}) {
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<
        Array<string | number>
    >([]);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<
        Array<string | number>
    >([]);
    const filterDefs: CrudFilterDefinition[] = [
        {
            key: 'search',
            type: 'search',
            placeholder: 'Search transactions and invoices...',
        },
    ];
    const crud = useCrudFilters({
        url: `/clients/${client.id}/finance`,
        definitions: filterDefs,
        initialFilters: filters,
    });

    const transactionColumns: DataTableColumn<TransactionRow>[] = [
        {
            key: 'description',
            header: 'Description',
            render: (row) => (
                <Link
                    href={`/finance/transactions/${row.id}`}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {row.description}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) => <FinanceProjectLabel project={row.project} />,
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row) => (
                <FinanceAmount
                    amount={row.amount}
                    currency={row.currency}
                    variant="transaction"
                />
            ),
        },
        {
            key: 'occurred_date',
            header: 'Occurred',
            render: (row) => formatDateOnly(row.occurred_date),
        },
        {
            key: 'category',
            header: 'Category',
            render: (row) => row.category ?? '—',
        },
    ];

    const invoiceColumns: DataTableColumn<InvoiceRow>[] = [
        {
            key: 'reference',
            header: 'Reference',
            render: (row) => (
                <Link
                    href={`/finance/invoices/${row.id}`}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {row.reference}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) => <FinanceProjectLabel project={row.project} />,
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => <FinanceStatusBadge status={row.status} />,
        },
        {
            key: 'issued_at',
            header: 'Issued',
            render: (row) => formatDateOnly(row.issued_at),
        },
        {
            key: 'due_at',
            header: 'Due',
            render: (row) => formatDateOnly(row.due_at),
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row) => (
                <FinanceAmount amount={row.amount} currency={row.currency} />
            ),
        },
    ];

    return (
        <>
            <Head title={`${client.name} Finance`} />
            <CrudPage
                title={`${client.name} Finance`}
                description="Transactions and invoices across the client projects you can access."
                actions={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm">
                            <Link href="/finance/transactions">
                                Transactions
                            </Link>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/finance/invoices">Invoices</Link>
                        </Button>
                    </div>
                }
            >
                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${transactions.length} transaction${transactions.length === 1 ? '' : 's'} · ${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
                />

                <div className="space-y-6">
                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <Receipt className="size-5 text-blue-500" />
                            Transactions
                        </h2>
                        <DataTable
                            columns={transactionColumns}
                            rows={transactions}
                            emptyText="No transactions for this client yet."
                            getRowId={(row) => row.id}
                            selectedRowIds={selectedTransactionIds}
                            onSelectedRowIdsChange={setSelectedTransactionIds}
                        />
                    </section>

                    <section className="space-y-3">
                        <h2 className="flex items-center gap-2 text-lg font-semibold">
                            <FileText className="size-5 text-violet-500" />
                            Invoices
                        </h2>
                        <DataTable
                            columns={invoiceColumns}
                            rows={invoices}
                            emptyText="No invoices for this client yet."
                            getRowId={(row) => row.id}
                            selectedRowIds={selectedInvoiceIds}
                            onSelectedRowIdsChange={setSelectedInvoiceIds}
                        />
                    </section>
                </div>
            </CrudPage>
        </>
    );
}

ClientFinancePage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
