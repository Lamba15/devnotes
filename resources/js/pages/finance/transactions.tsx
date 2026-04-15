import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FinanceAmount } from '@/components/finance/finance-amount';
import { FinanceProjectLabel } from '@/components/finance/finance-project-label';
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
import { formatDateOnly, formatDetailedTimestamp } from '@/lib/datetime';

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
    currency: string | null;
    occurred_date: string | null;
    created_at: string | null;
    project: Project;
};

export default function FinanceTransactions({
    transactions,
    project_filter_options,
    category_filter_options,
    currency_filter_options,
    direction_filter_options,
    filters,
    pagination,
}: {
    transactions: Transaction[];
    project_filter_options: Array<{ label: string; value: string }>;
    category_filter_options: Array<{ label: string; value: string }>;
    currency_filter_options: Array<{ label: string; value: string }>;
    direction_filter_options: Array<{ label: string; value: string }>;
    filters: {
        search: string;
        sort_by: string;
        sort_direction: string;
        project_id: string[];
        category: string[];
        currency: string[];
        direction: string[];
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
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<
        Array<string | number>
    >([]);

    const filterDefs: CrudFilterDefinition[] = [
        {
            key: 'search',
            type: 'search',
            placeholder: 'Search transactions...',
        },
        {
            key: 'project_id',
            type: 'select',
            placeholder: 'Project',
            options: project_filter_options,
            className: 'lg:w-56',
        },
        {
            key: 'category',
            type: 'select',
            placeholder: 'Category',
            options: category_filter_options,
            className: 'lg:w-44',
        },
        {
            key: 'currency',
            type: 'select',
            placeholder: 'Currency',
            options: currency_filter_options,
            className: 'lg:w-36',
        },
        {
            key: 'direction',
            type: 'select',
            placeholder: 'Direction',
            options: direction_filter_options,
            className: 'lg:w-36',
        },
    ];
    const crud = useCrudFilters({
        url: '/finance/transactions',
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'occurred_date',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const columns: DataTableColumn<Transaction>[] = [
        {
            key: 'description',
            header: 'Description',
            sortable: true,
            sortKey: 'description',
            render: (transaction) => (
                <Link
                    href={`/finance/transactions/${transaction.id}`}
                    className="cursor-pointer font-medium underline-offset-4 hover:underline"
                >
                    {transaction.description}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (transaction) => (
                <FinanceProjectLabel stacked project={transaction.project} />
            ),
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (transaction) => (
                <FinanceAmount
                    amount={transaction.amount}
                    currency={transaction.currency}
                    variant="transaction"
                />
            ),
        },
        {
            key: 'occurred_date',
            header: 'Occurred',
            sortable: true,
            sortKey: 'occurred_date',
            render: (transaction) => formatDateOnly(transaction.occurred_date),
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            sortKey: 'created_at',
            render: (transaction) =>
                formatDetailedTimestamp(transaction.created_at),
        },
    ];

    const bulkActions = [
        {
            label: 'Open PDF',
            disabled: selectedTransactionIds.length !== 1,
            disabledReason:
                selectedTransactionIds.length > 1
                    ? 'Select only 1 transaction to open.'
                    : undefined,
            onClick: () => {
                if (selectedTransactionIds.length === 1) {
                    window.location.assign(
                        `/finance/transactions/${selectedTransactionIds[0]}/pdf`,
                    );
                }
            },
        },
        {
            label: 'Edit',
            disabled: selectedTransactionIds.length !== 1,
            disabledReason:
                selectedTransactionIds.length > 1
                    ? 'Select only 1 transaction to edit.'
                    : undefined,
            onClick: () => {
                if (selectedTransactionIds.length === 1) {
                    window.location.assign(
                        `/finance/transactions/${selectedTransactionIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            onClick: () => {
                if (selectedTransactionIds.length > 0) {
                    setDeleteIds(selectedTransactionIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/finance/transactions/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedTransactionIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title="Transactions" />
            <CrudPage
                title="Transactions"
                description="Manage project-linked financial transactions."
                actions={
                    <Button asChild>
                        <Link href="/finance/transactions/create">
                            <Plus className="mr-1.5 size-4" />
                            Create transaction
                        </Link>
                    </Button>
                }
            >
                <CrudFilters definitions={filterDefs} state={crud} />

                <DataTable
                    columns={columns}
                    rows={transactions}
                    emptyText="No transactions yet."
                    getRowId={(transaction) => transaction.id}
                    selectedRowIds={selectedTransactionIds}
                    onSelectedRowIdsChange={setSelectedTransactionIds}
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
                                Delete transaction
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} transaction
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

FinanceTransactions.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
