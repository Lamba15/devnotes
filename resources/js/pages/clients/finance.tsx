import { Head, Link } from '@inertiajs/react';
import { FileText, Receipt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { ClientFinanceAnalysis } from '@/components/finance/client-finance-analysis';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    viewer_perspective,
    filters,
    analysis,
    transactions,
    invoices,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    viewer_perspective: 'platform_owner' | 'client_user';
    filters: { search: string };
    analysis: {
        overall: {
            project_count: number;
            transaction_count: number;
            invoice_count: number;
            currencies: string[];
            running_account: {
                amount: number;
                currency: string | null;
                mixed_currencies: boolean;
            };
            relationship_volume: {
                amount: number;
                currency: string | null;
                mixed_currencies: boolean;
            };
            transaction_volume: {
                amount: number;
                currency: string | null;
                mixed_currencies: boolean;
            };
        };
        by_currency: Array<{
            currency: string | null;
            label: string;
            running_account: number;
            client_owes_you: number;
            you_owe_client: number;
            transaction_total: number;
            invoice_total: number;
            received_total: number;
            refund_total: number;
            open_invoice_total: number;
            invoice_statuses: Record<
                string,
                {
                    count: number;
                    amount: number;
                }
            >;
            timeline: {
                default_granularity: 'month' | 'quarter' | 'year';
                points: Array<{
                    period: string;
                    label: string;
                    year: number;
                    quarter: number;
                    period_invoiced: number;
                    period_paid: number;
                    cumulative_invoiced: number;
                    cumulative_paid: number;
                    running_account: number;
                }>;
            };
        }>;
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
    const [drillMonth, setDrillMonth] = useState<{
        period: string;
        label: string;
    } | null>(null);

    const drillData = useMemo(() => {
        if (!drillMonth) {
            return { txs: [], invs: [] };
        }

        const txs = transactions.filter(
            (tx) =>
                tx.occurred_date?.startsWith(drillMonth.period) ?? false,
        );
        const invs = invoices.filter(
            (inv) => inv.issued_at?.startsWith(drillMonth.period) ?? false,
        );

        return { txs, invs };
    }, [drillMonth, transactions, invoices]);
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
                    <ClientFinanceAnalysis
                        analysis={analysis}
                        viewerPerspective={viewer_perspective}
                        onMonthClick={(period, label) =>
                            setDrillMonth({ period, label })
                        }
                    />

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

            <Dialog
                open={drillMonth !== null}
                onOpenChange={(open) => !open && setDrillMonth(null)}
            >
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{drillMonth?.label}</DialogTitle>
                    </DialogHeader>

                    {drillData.txs.length > 0 ? (
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                <Receipt className="size-3.5 text-blue-500" />
                                Transactions ({drillData.txs.length})
                            </h3>
                            <div className="space-y-1.5">
                                {drillData.txs.map((tx) => (
                                    <Link
                                        key={tx.id}
                                        href={`/finance/transactions/${tx.id}`}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:border-border hover:bg-muted/30"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {tx.description}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {tx.project?.name} &middot;{' '}
                                                {formatDateOnly(
                                                    tx.occurred_date,
                                                )}
                                            </p>
                                        </div>
                                        <FinanceAmount
                                            amount={tx.amount}
                                            currency={tx.currency}
                                            variant="transaction"
                                        />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {drillData.invs.length > 0 ? (
                        <div>
                            <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                <FileText className="size-3.5 text-violet-500" />
                                Invoices ({drillData.invs.length})
                            </h3>
                            <div className="space-y-1.5">
                                {drillData.invs.map((inv) => (
                                    <Link
                                        key={inv.id}
                                        href={`/finance/invoices/${inv.id}`}
                                        className="flex items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 transition-colors hover:border-border hover:bg-muted/30"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">
                                                {inv.reference}
                                            </p>
                                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                                {inv.project?.name} &middot;{' '}
                                                {formatDateOnly(inv.issued_at)}
                                                <FinanceStatusBadge
                                                    status={inv.status}
                                                />
                                            </p>
                                        </div>
                                        <FinanceAmount
                                            amount={inv.amount}
                                            currency={inv.currency}
                                        />
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {drillData.txs.length === 0 &&
                    drillData.invs.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No transactions or invoices in{' '}
                            {drillMonth?.label}.
                        </p>
                    ) : null}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Close</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

ClientFinancePage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
