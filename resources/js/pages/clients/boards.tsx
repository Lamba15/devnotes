import { Head, Link, router } from '@inertiajs/react';
import { Columns3, Plus } from 'lucide-react';
import { useState } from 'react';
import { CrudFilters } from '@/components/crud/crud-filters';
import { CrudPage } from '@/components/crud/crud-page';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
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
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import { useCrudFilters } from '@/hooks/use-crud-filters';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type BoardRow = {
    id: number;
    name: string;
    columns_count: number;
    can_manage: boolean;
    project?: { id: number; name: string } | null;
};

export default function ClientBoardsPage({
    client,
    boards,
    filters,
    pagination,
    can_create_boards,
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
    can_create_boards: boolean;
}) {
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );
    const [selectedBoardIds, setSelectedBoardIds] = useState<
        Array<string | number>
    >([]);

    const filterDefs: CrudFilterDefinition[] = [
        { key: 'search', type: 'search', placeholder: 'Search boards...' },
    ];
    const crud = useCrudFilters({
        url: `/clients/${client.id}/boards`,
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

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
    ];

    const selectedBoards = boards.filter((board) =>
        selectedBoardIds.includes(board.id),
    );
    const selectedBoard =
        selectedBoards.length === 1 ? selectedBoards[0] : null;
    const selectionIncludesReadOnlyBoard =
        selectedBoards.length > 0 &&
        selectedBoards.some((board) => !board.can_manage);

    const bulkActions = [
        {
            label: 'Open',
            disabled: selectedBoards.length !== 1,
            disabledReason: 'Select exactly one board to open.',
            onClick: () => {
                if (selectedBoards.length === 1) {
                    visitBoard(selectedBoards[0]);
                }
            },
        },
        ...(boards.some((board) => board.can_manage)
            ? [
                  {
                      label: 'Edit',
                      disabled:
                          selectedBoardIds.length !== 1 ||
                          selectedBoard?.can_manage !== true,
                      disabledReason:
                          selectedBoardIds.length !== 1
                              ? 'Select exactly one board to edit.'
                              : 'You do not have permission to edit that board.',
                      onClick: () => {
                          if (selectedBoard?.can_manage) {
                              router.visit(
                                  `/clients/${client.id}/boards/${selectedBoard.id}/edit`,
                              );
                          }
                      },
                  },
                  {
                      label: 'Delete',
                      destructive: true,
                      disabled:
                          selectedBoards.length === 0 ||
                          selectionIncludesReadOnlyBoard,
                      disabledReason:
                          selectedBoards.length === 0
                              ? 'Select at least one board to delete.'
                              : selectionIncludesReadOnlyBoard
                                ? 'You do not have permission to delete one or more selected boards.'
                                : undefined,
                      onClick: () => {
                          if (
                              selectedBoardIds.length > 0 &&
                              !selectionIncludesReadOnlyBoard
                          ) {
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
                    can_create_boards ? (
                        <Button asChild>
                            <Link href={`/clients/${client.id}/boards/create`}>
                                <Plus className="mr-1.5 size-4" />
                                Create board
                            </Link>
                        </Button>
                    ) : undefined
                }
            >
                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${pagination.total} board${pagination.total === 1 ? '' : 's'}`}
                />

                <DataTable
                    columns={columns}
                    rows={boards}
                    emptyText="No boards available in this client workspace."
                    getRowId={(board) => board.id}
                    selectedRowIds={selectedBoardIds}
                    onSelectedRowIdsChange={setSelectedBoardIds}
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
