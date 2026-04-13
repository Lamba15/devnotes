import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
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
import { Input } from '@/components/ui/input';
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
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/finance/invoices',
                {
                    search: query || undefined,
                    sort_by: sortBy,
                    sort_direction: sortDirection,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [query, sortBy, sortDirection]);

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
                    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    draft: 'bg-muted text-muted-foreground',
                };

                return (
                    <Badge variant="outline" className={`capitalize ${colors[invoice.status] ?? ''}`}>
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
                <span className="font-medium">{formatCurrencyAmount(invoice.amount, invoice.currency)}</span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (invoice) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open',
                            onClick: () =>
                                window.location.assign(
                                    `/finance/invoices/${invoice.id}`,
                                ),
                        },
                        {
                            label: 'Edit',
                            onClick: () =>
                                window.location.assign(
                                    `/finance/invoices/${invoice.id}/edit`,
                                ),
                        },
                        {
                            label: 'Delete',
                            destructive: true,
                            onClick: () => setDeleteIds([invoice.id]),
                        },
                    ]}
                />
            ),
        },
    ];

    const bulkActions = [
        {
            label: 'Edit selected',
            onClick: () => {
                if (selectedInvoiceIds.length === 1) {
                    window.location.assign(
                        `/finance/invoices/${selectedInvoiceIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete selected',
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
                <FilterBar>
                    <div className="relative md:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search invoices..."
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={invoices}
                    emptyText="No invoices yet."
                    getRowId={(invoice) => invoice.id}
                    selectedRowIds={selectedInvoiceIds}
                    onSelectedRowIdsChange={setSelectedInvoiceIds}
                    bulkActions={bulkActions}
                    currentSort={{
                        sortBy,
                        sortDirection: sortDirection as 'asc' | 'desc',
                    }}
                    onSortChange={(nextSortBy) => {
                        if (sortBy === nextSortBy) {
                            setSortDirection((current) =>
                                current === 'asc' ? 'desc' : 'asc',
                            );
                        } else {
                            setSortBy(nextSortBy);
                            setSortDirection('asc');
                        }
                    }}
                    pagination={pagination}
                    onPageChange={(page) =>
                        router.get(
                            '/finance/invoices',
                            {
                                search: query || undefined,
                                sort_by: sortBy,
                                sort_direction: sortDirection,
                                page,
                            },
                            {
                                preserveState: true,
                                preserveScroll: true,
                                replace: true,
                            },
                        )
                    }
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
