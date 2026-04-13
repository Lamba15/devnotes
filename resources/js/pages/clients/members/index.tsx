import { Head, Link, router } from '@inertiajs/react';
import { Coins, Search, Shield, UserPlus } from 'lucide-react';
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
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type Membership = {
    id: number;
    role: 'owner' | 'admin' | 'member';
    permissions: string[];
    created_at: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        email_verified_at: string | null;
        avatar_path?: string | null;
        ai_credits?: number;
        ai_credits_used?: number;
    };
};

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

export default function ClientMembersIndex({
    client,
    memberships,
    filters,
    pagination,
    can_manage_members,
    can_open_member_profiles,
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
    can_open_member_profiles: boolean;
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
            render: (membership) => {
                const avatarSrc = membership.user.avatar_path
                    ? `/storage/${membership.user.avatar_path}`
                    : null;

                return (
                    <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                            {avatarSrc ? (
                                <AvatarImage
                                    src={avatarSrc}
                                    alt={membership.user.name}
                                />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {getInitials(membership.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        {can_open_member_profiles ? (
                            <Link
                                href={`/clients/${client.id}/members/${membership.id}`}
                                className="font-medium underline-offset-4 hover:underline"
                            >
                                {membership.user.name}
                            </Link>
                        ) : (
                            <span className="font-medium">
                                {membership.user.name}
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'email',
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            render: (membership) => (
                <span className="text-muted-foreground">
                    {membership.user.email}
                </span>
            ),
        },
        {
            key: 'role',
            header: 'Role',
            sortable: true,
            sortKey: 'role',
            render: (membership) => (
                <Badge variant="outline" className="capitalize">
                    {membership.role}
                </Badge>
            ),
        },
        {
            key: 'permissions',
            header: 'Access',
            render: (membership) =>
                membership.role === 'owner' || membership.role === 'admin' ? (
                    <Badge variant="outline">Unrestricted</Badge>
                ) : membership.permissions.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {membership.permissions.slice(0, 3).map((permission) => (
                            <Badge
                                key={permission}
                                variant="outline"
                                className="text-[10px]"
                            >
                                {permission}
                            </Badge>
                        ))}
                        {membership.permissions.length > 3 ? (
                            <Badge variant="secondary" className="text-[10px]">
                                +{membership.permissions.length - 3}
                            </Badge>
                        ) : null}
                    </div>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        No explicit permissions
                    </span>
                ),
        },
        {
            key: 'ai_credits',
            header: 'AI Credits',
            render: (membership) => {
                const credits = membership.user.ai_credits ?? 0;
                const used = membership.user.ai_credits_used ?? 0;

                return (
                    <div className="flex items-center gap-1.5 text-sm">
                        <Coins className="size-3.5 text-muted-foreground" />
                        <span>
                            {credits === -1 ? 'Unlimited' : `${used}/${credits}`}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: '',
            render: (membership) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'Open profile',
                            onClick: () =>
                                router.visit(
                                    `/clients/${client.id}/members/${membership.id}`,
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
            label: 'Open selected',
            onClick: () => {
                if (selectedMembershipIds.length === 1) {
                    router.visit(
                        `/clients/${client.id}/members/${selectedMembershipIds[0]}`,
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
                description="Roster view for member profiles, permissions, assignments, activity, and AI credits."
                actions={
                    can_manage_members ? (
                        <Button asChild>
                            <Link href={`/clients/${client.id}/members/create`}>
                                <UserPlus className="mr-1.5 size-4" />
                                Create client user
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <FilterBar>
                    <div className="relative md:max-w-sm flex-1">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search members by name, email, or role"
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card/70 px-4 py-3 text-sm text-muted-foreground">
                    <Shield className="size-4" />
                    Finance is now managed as a normal member permission. Owners and admins still have unrestricted client access.
                </div>

                <DataTable
                    columns={columns}
                    rows={memberships}
                    emptyText="No client users yet."
                    getRowId={
                        can_manage_members
                            ? (membership) => membership.id
                            : undefined
                    }
                    selectedRowIds={
                        can_manage_members ? selectedMembershipIds : undefined
                    }
                    onSelectedRowIdsChange={
                        can_manage_members
                            ? setSelectedMembershipIds
                            : undefined
                    }
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
