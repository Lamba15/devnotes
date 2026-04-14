import { Head, Link } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowUpRight,
    DollarSign,
    FileText,
    Receipt,
} from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatDateOnly } from '@/lib/datetime';
import { formatCurrencyAmount } from '@/lib/format-currency';

type TransactionRow = {
    id: number;
    description: string;
    amount: string;
    currency: string | null;
    occurred_date: string | null;
    project?: { id: number; name: string } | null;
};

type InvoiceRow = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    currency: string | null;
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
            render: (row) => row.description,
        },
        {
            key: 'project',
            header: 'Project',
            render: (row) => row.project?.name ?? '—',
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row) => {
                const num = Number(row.amount);
                const isPositive = num >= 0;

                return (
                    <span
                        className={`inline-flex items-center gap-1 font-medium ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                        {isPositive ? (
                            <ArrowUpRight className="size-3" />
                        ) : (
                            <ArrowDownRight className="size-3" />
                        )}
                        {formatCurrencyAmount(num, row.currency, {
                            absolute: true,
                        })}
                    </span>
                );
            },
        },
        {
            key: 'occurred_date',
            header: 'Occurred',
            render: (row) => formatDateOnly(row.occurred_date),
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
        {
            key: 'status',
            header: 'Status',
            render: (row) => {
                const colors: Record<string, string> = {
                    paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                    pending:
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    overdue:
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    draft: 'bg-muted text-muted-foreground',
                };

                return (
                    <Badge
                        variant="outline"
                        className={`capitalize ${colors[row.status] ?? ''}`}
                    >
                        {row.status}
                    </Badge>
                );
            },
        },
        {
            key: 'amount',
            header: 'Amount',
            render: (row) => (
                <span className="font-medium">
                    {formatCurrencyAmount(row.amount, row.currency)}
                </span>
            ),
        },
    ];

    return (
        <>
            <Head title={`${client.name} Finance`} />
            <CrudPage
                title={`${client.name} Finance`}
                description="Transactions and invoices across the client projects you can access."
            >
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="size-5 text-emerald-500" />
                            Client finance
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                This brings together transactions and invoices
                                across the client projects you can access.
                            </p>
                            <div className="flex gap-2">
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/finance/transactions">
                                        Transactions
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" size="sm">
                                    <Link href="/finance/invoices">
                                        Invoices
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
