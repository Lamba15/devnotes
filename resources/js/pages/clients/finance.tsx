import { Head } from '@inertiajs/react';
import { useState } from 'react';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type TransactionRow = {
    id: number;
    description: string;
    amount: string;
    occurred_at: string | null;
    project?: { id: number; name: string } | null;
};

type InvoiceRow = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    project?: { id: number; name: string } | null;
};

export default function ClientFinancePage({
    client,
    transactions,
    invoices,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    transactions: TransactionRow[];
    invoices: InvoiceRow[];
}) {
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<
        Array<string | number>
    >([]);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<
        Array<string | number>
    >([]);

    const transactionColumns: DataTableColumn<TransactionRow>[] = [
        {
            key: 'description',
            header: 'Description',
            render: (row) => row.description,
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) => row.project?.name ?? '—',
        },
        { key: 'amount', header: 'Amount', render: (row) => row.amount },
        {
            key: 'occurred_at',
            header: 'Occurred',
            render: (row) => row.occurred_at ?? '—',
        },
    ];

    const invoiceColumns: DataTableColumn<InvoiceRow>[] = [
        {
            key: 'reference',
            header: 'Reference',
            render: (row) => row.reference,
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) => row.project?.name ?? '—',
        },
        { key: 'status', header: 'Status', render: (row) => row.status },
        { key: 'amount', header: 'Amount', render: (row) => row.amount },
    ];

    return (
        <>
            <Head title={`${client.name} Finance`} />
            <div className="space-y-6">
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle>Client finance</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This brings together transactions and invoices across
                        the client projects you can access.
                    </CardContent>
                </Card>

                <div className="space-y-6">
                    <section className="space-y-3">
                        <h2 className="text-lg font-semibold">Transactions</h2>
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
                        <h2 className="text-lg font-semibold">Invoices</h2>
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
            </div>
        </>
    );
}

ClientFinancePage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
