import { Head, Link, router } from '@inertiajs/react';
import { Columns3, Plus, Search } from 'lucide-react';
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
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type BoardRow = {
    id: number;
    name: string;
    columns_count: number;
    project?: { id: number; name: string } | null;
};

export default function ClientBoardsPage({
    client,
    boards,
    filters,
    pagination,
    can_manage_boards,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    boards: BoardRow[];
    filters: { search: string; sort_by: string; sort_direction: string };
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    can_manage_boards: boolean;
}) {
    const [query, setQuery] = useState(filters.search ?? '');
    const [sortBy, setSortBy] = useState(filters.sort_by ?? 'created_at');
    const [sortDirection, setSortDirection] = useState(
        filters.sort_direction ?? 'desc',
    );
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedBoardIds, setSelectedBoardIds] = useState<
        Array<string | number>
    >([]);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            router.get(
                `/clients/${client.id}/boards`,
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

    const visitBoard = (board: BoardRow) => {
        if (!board.project?.id) {
            return;
        }

        router.visit(
            `/clients/${client.id}/projects/${board.project.id}/boards/${board.id}`,
        );
    };

    const columns: DataTableColumn<BoardRow>[] = [
        {
            key: 'name',
            header: 'Board',
            sortable: true,
            sortKey: 'name',
            render: (board) =>
                board.project?.id ? (
                    <button
                        type="button"
                        className="cursor-pointer font-medium text-foreground transition hover:text-primary"
                        onClick={() => visitBoard(board)}
                    >
                        {board.name}
                    </button>
                ) : (
                    board.name
                ),
        },
        {
            key: 'project',
            header: 'Project',
            sortable: true,
            sortKey: 'project_name',
            render: (board) => board.project?.name ?? '—',
        },
        {
            key: 'columns_count',
            header: 'Columns',
            sortable: true,
            sortKey: 'columns_count',
            render: (board) => (
                <Badge variant="outline" className="gap-1">
                    <Columns3 className="size-3 text-muted-foreground" />
                    {board.columns_count}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (board) => (
                <ActionDropdown
                    items={[
                        {
                            label: 'View board',
                            onClick: () => visitBoard(board),
                        },
                        ...(can_manage_boards
                            ? [
                                  {
                                      label: 'Edit',
                                      onClick: () =>
                                          router.visit(
                                              `/clients/${client.id}/boards/${board.id}/edit`,
                                          ),
                                  },
                                  {
                                      label: 'Delete',
                                      destructive: true,
                                      onClick: () => setDeleteIds([board.id]),
                                  },
                              ]
                            : []),
                    ]}
                />
            ),
        },
    ];

    const selectedBoards = boards.filter((board) =>
        selectedBoardIds.includes(board.id),
    );

    const bulkActions = [
        {
            label: 'Open selected',
            onClick: () => {
                if (selectedBoards.length === 1) {
                    visitBoard(selectedBoards[0]);
                }
            },
        },
        ...(can_manage_boards
            ? [
                  {
                      label: 'Edit selected',
                      onClick: () => {
                          if (selectedBoardIds.length === 1) {
                              router.visit(
                                  `/clients/${client.id}/boards/${selectedBoardIds[0]}/edit`,
                              );
                          }
                      },
                  },
                  {
                      label: 'Delete selected',
                      destructive: true,
                      onClick: () => {
                          if (selectedBoardIds.length > 0) {
                              setDeleteIds(selectedBoardIds);
                          }
                      },
                  },
              ]
            : []),
    ];

    const confirmDelete = async () => {
        if (!deleteIds) {
            return;
        }

        for (const id of deleteIds) {
            await router.delete(`/clients/${client.id}/boards/${id}`, {
                preserveScroll: true,
                preserveState: true,
            });
        }

        setSelectedBoardIds((current) =>
            current.filter((id) => !deleteIds.includes(id)),
        );
        setDeleteIds(null);
    };

    return (
        <>
            <Head title={`${client.name} Boards`} />
            <CrudPage
                title={`${client.name} Boards`}
                description="Manage the boards available across this client workspace without leaving the portal context."
                actions={
                    can_manage_boards ? (
                        <Link href={`/clients/${client.id}/boards/create`}>
                            <Button>
                                <Plus className="mr-1.5 size-4" />
                                Create board
                            </Button>
                        </Link>
                    ) : undefined
                }
            >
                <FilterBar
                    meta={`${pagination.total} board${pagination.total === 1 ? '' : 's'}`}
                >
                    <div className="relative md:max-w-sm">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search boards..."
                            className="pl-9"
                        />
                    </div>
                </FilterBar>

                <DataTable
                    columns={columns}
                    rows={boards}
                    emptyText="No boards available in this client workspace."
                    getRowId={(board) => board.id}
                    selectedRowIds={selectedBoardIds}
                    onSelectedRowIdsChange={setSelectedBoardIds}
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
                            `/clients/${client.id}/boards`,
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
                                Delete board
                                {deleteIds?.length === 1 ? '' : 's'}?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} board
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
                                Delete
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CrudPage>
        </>
    );
}

ClientBoardsPage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
