import { Head, Link, router } from '@inertiajs/react';
import { Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

type Behavior = {
    id: number;
    name: string;
    slug: string;
};

type Client = {
    id: number;
    name: string;
    email: string | null;
    image_path: string | null;
    behavior: Behavior;
    created_at: string;
    running_account: {
        amount: number | null;
        currency: string | null;
        mixed_currencies: boolean;
    };
    relationship_volume: {
        amount: number | null;
        currency: string | null;
        mixed_currencies: boolean;
    };
    can_view_finance_summary: boolean;
};

export default function ClientsIndex({
    clients,
    filters,
    pagination,
    can_create_clients,
}: {
    clients: Client[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    can_create_clients: boolean;
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedClientIds, setSelectedClientIds] = useState<
        Array<string | number>
    >([]);

    const renderMoneySummary = (summary: Client['running_account']) => {
        if (!summary) {
            return '—';
        }

        if (summary.amount === null) {
            return '—';
        }

        if (summary.mixed_currencies) {
            return 'Mixed';
        }

        if (summary.currency) {
            return formatCurrencyAmount(summary.amount, summary.currency);
        }

        return Number(summary.amount) === 0
            ? '0'
            : Number(summary.amount).toLocaleString();
    };

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                '/clients',
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

    const columns: DataTableColumn<Client>[] = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            sortKey: 'name',
            render: (client) => (
                <Link
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-2.5 font-medium underline-offset-4 hover:underline"
                >
                    <Avatar className="size-7">
                        {client.image_path && (
                            <AvatarImage
                                src={`/storage/${client.image_path}`}
                                alt={client.name}
                            />
                        )}
                        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                            {client.name
                                .split(' ')
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    {client.name}
                </Link>
            ),
        },
        {
            key: 'behavior',
            header: 'Behavior',
            render: (client) => (
                <Badge variant="outline" className="capitalize">
                    {client.behavior.name}
                </Badge>
            ),
        },
        {
            key: 'email',
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            render: (client) => client.email ?? '—',
        },
        {
            key: 'running_account',
            header: 'Running account',
            sortable: true,
            sortKey: 'running_account',
            render: (client) => (
                <span className="font-medium">
                    {renderMoneySummary(client.running_account)}
                </span>
            ),
        },
        {
            key: 'relationship_volume',
            header: 'Relationship volume',
            sortable: true,
            sortKey: 'relationship_volume',
            render: (client) => (
                <span className="font-medium">
                    {renderMoneySummary(client.relationship_volume)}
                </span>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (client) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open workspace',
                            onClick: () =>
                                router.visit(`/clients/${client.id}`),
                        },
                        {
                            label: 'Edit',
                            onClick: () =>
                                router.visit(`/clients/${client.id}/edit`),
                        },
                        {
                            label: 'Delete',
                            destructive: true,
                            onClick: () => setDeleteIds([client.id]),
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
                if (selectedClientIds.length === 1) {
                    router.visit(`/clients/${selectedClientIds[0]}/edit`);
                }
            },
        },
        {
            label: 'Delete selected',
            destructive: true,
            onClick: () => {
                if (selectedClientIds.length > 0) {
                    setDeleteIds(selectedClientIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/clients/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedClientIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title="Clients" />
            <CrudPage
                title="Clients"
                description="Manage clients as a real domain and enter each client workspace for their own members, projects, tracking, and finance."
                actions={can_create_clients ? (
                    <Button asChild>
                        <Link href="/clients/create">
                            <Plus className="mr-1.5 size-4" />
                            Create client
                        </Link>
                    </Button>
                ) : null}
            >
                <FilterBar>
                    <div className="relative md:max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search clients by name, email, or behavior"
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={clients}
                    emptyText="No clients yet."
                    getRowId={(client) => client.id}
                    selectedRowIds={selectedClientIds}
                    onSelectedRowIdsChange={setSelectedClientIds}
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
                            '/clients',
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
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteIds(null);
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Delete client
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} client
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

ClientsIndex.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
