import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
import { FinanceStatusBadge } from '@/components/finance/finance-status-badge';
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
import { formatDateOnly } from '@/lib/datetime';

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
    project_filter_options,
    status_filter_options,
    currency_filter_options,
    filters,
    pagination,
}: {
    invoices: Invoice[];
    project_filter_options: Array<{ label: string; value: string }>;
    status_filter_options: Array<{ label: string; value: string }>;
    currency_filter_options: Array<{ label: string; value: string }>;
    filters: {
        search: string;
        sort_by: string;
        sort_direction: string;
        project_id: string[];
        status: string[];
        currency: string[];
    };
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
        {
            key: 'project_id',
            type: 'select',
            placeholder: 'Project',
            options: project_filter_options,
            className: 'lg:w-56',
        },
        {
            key: 'status',
            type: 'select',
            placeholder: 'Status',
            options: status_filter_options,
            className: 'lg:w-40',
        },
        {
            key: 'currency',
            type: 'select',
            placeholder: 'Currency',
            options: currency_filter_options,
            className: 'lg:w-36',
        },
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
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {invoice.reference}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (invoice) => (
                <FinanceProjectLabel stacked project={invoice.project} />
            ),
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            sortKey: 'status',
            render: (invoice) => <FinanceStatusBadge status={invoice.status} />,
        },
        {
            key: 'issued_at',
            header: 'Issued',
            sortable: true,
            sortKey: 'issued_at',
            render: (invoice) => formatDateOnly(invoice.issued_at),
        },
        {
            key: 'due_at',
            header: 'Due',
            sortable: true,
            sortKey: 'due_at',
            render: (invoice) => formatDateOnly(invoice.due_at),
        },
        {
            key: 'paid_at',
            header: 'Paid',
            sortable: true,
            sortKey: 'paid_at',
            render: (invoice) => formatDateOnly(invoice.paid_at),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (invoice) => (
                <FinanceAmount
                    amount={invoice.amount}
                    currency={invoice.currency}
                />
            ),
        },
    ];

    const bulkActions = [
        {
            label: 'Open PDF',
            disabled: selectedInvoiceIds.length !== 1,
            disabledReason: 'Select exactly one invoice to open.',
            onClick: () => {
                if (selectedInvoiceIds.length === 1) {
                    window.open(
                        `/finance/invoices/${selectedInvoiceIds[0]}/pdf`,
                        '_blank',
                        'noopener,noreferrer',
                    );
                }
            },
        },
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
