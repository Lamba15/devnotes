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
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type Membership = {
    id: number;
    role: string;
    user: {
        id: number;
        name: string;
        email: string;
        email_verified_at: string | null;
    };
};

export default function ClientMembersIndex({
    client,
    memberships,
    filters,
    pagination,
    can_manage_members,
}: {
    client: { id: number; name: string };
    memberships: Membership[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    can_manage_members: boolean;
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedMembershipIds, setSelectedMembershipIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                `/clients/${client.id}/members`,
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
    }, [client.id, query, sortBy, sortDirection]);

    const columns: DataTableColumn<Membership>[] = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            sortKey: 'name',
            render: (membership) => membership.user.name,
        },
        {
            key: 'email',
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            render: (membership) => membership.user.email,
        },
        {
            key: 'role',
            header: 'Role',
            sortable: true,
            sortKey: 'role',
            render: (membership) => membership.role,
        },
        {
            key: 'actions',
            header: '',
            render: (membership) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Edit',
                            onClick: () =>
                                router.visit(
                                    `/clients/${client.id}/members/${membership.id}/edit`,
                                ),
                        },
                        {
                            label: 'Remove',
                            destructive: true,
                            onClick: () => setDeleteIds([membership.id]),
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
                if (selectedMembershipIds.length === 1) {
                    router.visit(
                        `/clients/${client.id}/members/${selectedMembershipIds[0]}/edit`,
                    );
                }
            },
        },
        {
            label: 'Remove selected',
            destructive: true,
            onClick: () => {
                if (selectedMembershipIds.length > 0) {
                    setDeleteIds(selectedMembershipIds);
                }
            },
        },
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/clients/${client.id}/members/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedMembershipIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title={`${client.name} Members`} />
            <CrudPage
                title={`${client.name} Members`}
                description="Create portal users directly and attach them to this client."
                actions={
                    can_manage_members ? (
                        <Link href={`/clients/${client.id}/members/create`}>
                            <Button>Create client user</Button>
                        </Link>
                    ) : undefined
                }
            >
                <FilterBar>
                    <Input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search members by name, email, or role"
                        className="md:max-w-sm"
                    />
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={memberships}
                    emptyText="No client users yet."
                    getRowId={(membership) => membership.id}
                    selectedRowIds={selectedMembershipIds}
                    onSelectedRowIdsChange={setSelectedMembershipIds}
                    bulkActions={can_manage_members ? bulkActions : []}
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
                            `/clients/${client.id}/members`,
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
                                Remove client user
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This removes {deleteIds?.length ?? 0} membership
                                {deleteIds?.length === 1 ? '' : 's'} from this
                                client workspace.
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
                                Remove
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
        </>
    );
}

ClientMembersIndex.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
