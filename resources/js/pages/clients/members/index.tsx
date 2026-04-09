import { Head, Link, router } from '@inertiajs/react';
import { Bot, Coins, Search, UserPlus } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type Membership = {
    id: number;
    role: string;
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
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
}

function creditLabel(credits: number): string {
    if (credits === -1) return 'Unlimited';
    if (credits === 0) return 'None';
    return String(credits);
}

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

    const [creditMembership, setCreditMembership] =
        useState<Membership | null>(null);
    const [creditValue, setCreditValue] = useState('0');

    const isPlatformOwner = Boolean(
        (window as any).__page?.props?.auth?.user?.capabilities?.platform,
    );

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
                            {avatarSrc && (
                                <AvatarImage
                                    src={avatarSrc}
                                    alt={membership.user.name}
                                />
                            )}
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {getInitials(membership.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                            {membership.user.name}
                        </span>
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
            key: 'ai_credits',
            header: 'AI Credits',
            render: (membership) => {
                const credits = membership.user.ai_credits ?? 0;
                const used = membership.user.ai_credits_used ?? 0;
                return (
                    <div className="flex items-center gap-1.5 text-sm">
                        <Coins className="size-3.5 text-muted-foreground" />
                        <span>
                            {credits === -1
                                ? 'Unlimited'
                                : `${used}/${credits}`}
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
                            label: 'Edit',
                            onClick: () =>
                                router.visit(
                                    `/clients/${client.id}/members/${membership.id}/edit`,
                                ),
                        },
                        ...(isPlatformOwner
                            ? [
                                  {
                                      label: 'Manage AI credits',
                                      onClick: () => {
                                          setCreditMembership(membership);
                                          setCreditValue(
                                              String(
                                                  membership.user.ai_credits ??
                                                      0,
                                              ),
                                          );
                                      },
                                  },
                              ]
                            : []),
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
                            <Button>
                                <UserPlus className="mr-1.5 size-4" />
                                Create client user
                            </Button>
                        </Link>
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
                {/* Credit management dialog */}
                <Dialog
                    open={creditMembership !== null}
                    onOpenChange={(open) =>
                        !open && setCreditMembership(null)
                    }
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Bot className="size-5" />
                                Manage AI Credits
                            </DialogTitle>
                            <DialogDescription>
                                Set AI credits for{' '}
                                {creditMembership?.user.name ?? 'this user'}. Use
                                -1 for unlimited, 0 for none.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="grid gap-2">
                                <Label>Credits allocation</Label>
                                <Input
                                    type="number"
                                    value={creditValue}
                                    onChange={(e) =>
                                        setCreditValue(e.target.value)
                                    }
                                    min={-1}
                                    placeholder="Enter credit amount (-1 = unlimited)"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Currently used:{' '}
                                    {creditMembership?.user.ai_credits_used ??
                                        0}{' '}
                                    credits
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCreditValue('-1')}
                                >
                                    Unlimited
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCreditValue('0')}
                                >
                                    None
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCreditValue('50')}
                                >
                                    50
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setCreditValue('100')}
                                >
                                    100
                                </Button>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                onClick={() => {
                                    if (creditMembership) {
                                        router.put(
                                            `/users/${creditMembership.user.id}/credits`,
                                            {
                                                ai_credits:
                                                    parseInt(creditValue) || 0,
                                            },
                                            {
                                                preserveScroll: true,
                                                onSuccess: () =>
                                                    setCreditMembership(null),
                                            },
                                        );
                                    }
                                }}
                            >
                                Save credits
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
