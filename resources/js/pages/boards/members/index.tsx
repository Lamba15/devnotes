import { Head, Link, router } from '@inertiajs/react';
import { Search, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { FilterBar } from '@/components/crud/filter-bar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { formatDateOnly } from '@/lib/datetime';

type BoardMember = {
    id: number;
    created_at: string | null;
    user: {
        id: number;
        name: string;
        email: string;
        avatar_path?: string | null;
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

export default function BoardMembersIndex({
    client,
    board,
    project,
    memberships,
    filters,
    pagination,
    can_manage_members,
}: {
    client: { id: number; name: string };
    board: { id: number; name: string; project_id: number };
    project: { id: number; name: string };
    memberships: BoardMember[];
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
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);

    const basePath = `/clients/${client.id}/boards/${board.id}/members`;

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                basePath,
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
    }, [basePath, query, sortBy, sortDirection]);

    const columns: DataTableColumn<BoardMember>[] = [
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            sortKey: 'name',
            render: (member) => {
                const avatarSrc = member.user.avatar_path
                    ? `/storage/${member.user.avatar_path}`
                    : null;

                return (
                    <div className="flex items-center gap-2.5">
                        <Avatar className="size-7">
                            {avatarSrc && (
                                <AvatarImage
                                    src={avatarSrc}
                                    alt={member.user.name}
                                />
                            )}
                            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
                                {getInitials(member.user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.user.name}</span>
                    </div>
                );
            },
        },
        {
            key: 'email',
            header: 'Email',
            sortable: true,
            sortKey: 'email',
            render: (member) => (
                <span className="text-muted-foreground">
                    {member.user.email}
                </span>
            ),
        },
        {
            key: 'created_at',
            header: 'Added',
            sortable: true,
            sortKey: 'created_at',
            render: (member) => (
                <span className="text-muted-foreground">
                    {formatDateOnly(member.created_at?.slice(0, 10) ?? null)}
                </span>
            ),
        },
        ...(can_manage_members
            ? [
                  {
                      key: 'actions',
                      header: '',
                      render: (member: BoardMember) => (
                          <ActionDropdown
                              items={[
                                  {
                                      label: 'Remove',
                                      destructive: true,
                                      onClick: () => setDeleteIds([member.id]),
                                  },
                              ]}
                          />
                      ),
                  },
              ]
            : []),
    ];

    const bulkActions = can_manage_members
        ? [
              {
                  label: 'Remove selected',
                  destructive: true,
                  onClick: () => {
                      if (selectedIds.length > 0) {
                          setDeleteIds(selectedIds);
                      }
                  },
              },
          ]
        : [];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`${basePath}/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title={`${board.name} Members`} />
            <CrudPage
                title={`${board.name} Members`}
                description={`${client.name} / ${project.name}`}
                actions={
                    can_manage_members ? (
                        <Button asChild>
                            <Link href={`${basePath}/create`}>
                                <UserPlus className="mr-1.5 size-4" />
                                Add member
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <FilterBar>
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search members by name or email"
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={memberships}
                    emptyText="No board members yet."
                    getRowId={
                        can_manage_members ? (member) => member.id : undefined
                    }
                    selectedRowIds={
                        can_manage_members ? selectedIds : undefined
                    }
                    onSelectedRowIdsChange={
                        can_manage_members ? setSelectedIds : undefined
                    }
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
                            basePath,
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
                                Remove board member
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This removes {deleteIds?.length ?? 0} member
                                {deleteIds?.length === 1 ? '' : 's'} from this
                                board.
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

BoardMembersIndex.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
