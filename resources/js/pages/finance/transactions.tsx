import { Head, Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
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

export default function FinanceTransactions({
    transactions,
    filters,
    pagination,
}: {
    transactions: Transaction[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'occurred_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedTransactionIds, setSelectedTransactionIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/finance/transactions',
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

    const columns: DataTableColumn<Transaction>[] = [
        {
            key: 'description',
            header: 'Description',
            sortable: true,
            sortKey: 'description',
            render: (transaction) => (
                <Link
                    href={`/finance/transactions/${transaction.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {transaction.description}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (transaction) =>
                `${transaction.project.client.name} / ${transaction.project.name}`,
        },
        {
            key: 'amount',
            header: 'Amount',
            sortable: true,
            sortKey: 'amount',
            render: (transaction) => transaction.amount,
        },
        {
            key: 'occurred_at',
            header: 'Occurred',
            sortable: true,
            sortKey: 'occurred_at',
            render: (transaction) => transaction.occurred_at,
        },
        {
            key: 'actions',
            header: '',
            render: (transaction) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open',
                            onClick: () =>
                                window.location.assign(
                                    `/finance/transactions/${transaction.id}`,
                                ),
                        },
                        {
                            label: 'Edit',
                            onClick: () =>
                                window.location.assign(
                                    `/finance/transactions/${transaction.id}/edit`,
                                ),
                        },
                        {
                            label: 'Delete',
                            destructive: true,
                            onClick: () => setDeleteIds([transaction.id]),
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
                if (selectedTransactionIds.length === 1) {
                    window.location.assign(
                        `/finance/transactions/${selectedTransactionIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Delete selected',
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
                    <Link href="/finance/transactions/create">
                        <Button>Create transaction</Button>
                    </Link>
                }
            >
                <FilterBar>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search transactions by description, project, client, or amount"
                        className="md:max-w-sm"
                    />
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={transactions}
                    emptyText="No transactions yet."
                    getRowId={(transaction) => transaction.id}
                    selectedRowIds={selectedTransactionIds}
                    onSelectedRowIdsChange={setSelectedTransactionIds}
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
                            '/finance/transactions',
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
