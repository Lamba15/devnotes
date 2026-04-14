import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import AppLayout from '@/layouts/app-layout';
import { formatCurrencyAmount } from '@/lib/format-currency';

type Client = { id: number; name: string };
type Project = { id: number; name: string; client: Client };
type Invoice = {
    id: number;
    reference: string;
    status: string;
    amount: string;
    currency: string | null;
    issued_at: string | null;
    due_at: string | null;
    paid_at: string | null;
    project: Project;
};

export default function FinanceInvoices({
    invoices,
    filters,
    pagination,
}: {
    invoices: Invoice[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}) {
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<
        Array<string | number>
    >([]);

    const filterDefs: CrudFilterDefinition[] = [
        { key: 'search', type: 'search', placeholder: 'Search invoices...' },
    ];
    const crud = useCrudFilters({
        url: '/finance/invoices',
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const columns: DataTableColumn<Invoice>[] = [
        {
            key: 'reference',
            header: 'Reference',
            sortable: true,
            sortKey: 'reference',
            render: (invoice) => (
                <Link
                    href={`/finance/invoices/${invoice.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {invoice.reference}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (invoice) =>
                `${invoice.project.client.name} / ${invoice.project.name}`,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (invoice) => {
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
                        className={`capitalize ${colors[invoice.status] ?? ''}`}
                    >
                        {invoice.status}
                    </Badge>
                );
            },
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (invoice) => (
                <span className="font-medium">
                    {formatCurrencyAmount(invoice.amount, invoice.currency)}
                </span>
            ),
        },
    ];

    const bulkActions = [
        {
            label: 'Edit',
            disabled: selectedInvoiceIds.length !== 1,
            disabledReason: 'Select exactly one invoice to edit.',
            onClick: () => {
                if (selectedInvoiceIds.length === 1) {
                    window.location.assign(
                        `/finance/invoices/${selectedInvoiceIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedInvoiceIds.length > 0) {
                    setDeleteIds(selectedInvoiceIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/finance/invoices/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedInvoiceIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title="Invoices" />
            <CrudPage
                title="Invoices"
                description="Manage project-linked invoices and billing state."
                actions={
                    <Button asChild>
                        <Link href="/finance/invoices/create">
                            <Plus className="mr-1.5 size-4" />
                            Create invoice
                        </Link>
                    </Button>
                }
            >
                <CrudFilters definitions={filterDefs} state={crud} />

                <DataTable
                    columns={columns}
                    rows={invoices}
                    emptyText="No invoices yet."
                    getRowId={(invoice) => invoice.id}
                    selectedRowIds={selectedInvoiceIds}
                    onSelectedRowIdsChange={setSelectedInvoiceIds}
                    bulkActions={bulkActions}
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
                />

                <Dialog
                    open={deleteIds !== null}
                    onOpenChange={(open) => !open && setDeleteIds(null)}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete invoice
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} invoice
                                {deleteIds?.length === 1 ? '' : 's'}.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={() => void confirmDelete()}
                            >
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
        </>
    );
}

FinanceInvoices.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
