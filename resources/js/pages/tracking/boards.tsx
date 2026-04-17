import { Head, router } from '@inertiajs/react';
import {
    Building2,
    Columns3,
    FolderKanban,
    Ticket,
    User as UserIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import AppLayout from '@/layouts/app-layout';
import { formatDetailedTimestamp, formatRelativeInstant } from '@/lib/datetime';

type FilterOption = { label: string; value: string; count?: number };
type ProjectFilterOption = FilterOption & { client_id?: string };

type Person = { id: number; name: string; avatar_path?: string | null };

type BoardRow = {
    id: number;
    name: string;
    columns_count: number;
    placements_count: number;
    created_at: string | null;
    updated_at: string | null;
    creator: Person | null;
    project: { id: number; name: string } | null;
    client: { id: number; name: string } | null;
    show_url: string | null;
    edit_url: string | null;
    can_manage: boolean;
};

type Filters = {
    search: string;
    sort_by: string;
    sort_direction: 'asc' | 'desc';
    client_id: string[];
    project_id: string[];
    created_by: string[];
    created_from: string;
    created_to: string;
};

type Props = {
    boards: BoardRow[];
    filters: Filters;
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    client_filter_options: FilterOption[];
    project_filter_options: ProjectFilterOption[];
    creator_filter_options: FilterOption[];
};

export default function TrackingBoardsPage({
    boards,
    filters,
    pagination,
    client_filter_options,
    project_filter_options,
    creator_filter_options,
}: Props) {
    const [selectedIds, setSelectedIds] = useState<Array<string | number>>([]);
    const [deleteIds, setDeleteIds] = useState<Array<string | number> | null>(
        null,
    );

    const availableProjectOptions = useMemo<ProjectFilterOption[]>(() => {
        if (filters.client_id.length === 0) {
            return project_filter_options;
        }

        return project_filter_options.filter(
            (option) =>
                option.client_id !== undefined &&
                filters.client_id.includes(option.client_id),
        );
    }, [project_filter_options, filters.client_id]);

    const filterDefs: CrudFilterDefinition[] = [
        { key: 'search', type: 'search', placeholder: 'Search boards...' },
        {
            key: 'client_id',
            type: 'select',
            placeholder: 'Client',
            icon: Building2,
            options: client_filter_options,
            className: 'lg:w-48',
        },
        {
            key: 'project_id',
            type: 'select',
            placeholder: 'Project',
            icon: FolderKanban,
            options: availableProjectOptions,
            className: 'lg:w-56',
        },
        {
            key: 'created_by',
            type: 'select',
            placeholder: 'Created by',
            icon: UserIcon,
            options: creator_filter_options,
            className: 'lg:w-44',
        },
        { key: 'created_from', type: 'date', placeholder: 'Created from' },
        { key: 'created_to', type: 'date', placeholder: 'Created to' },
    ];

    const crud = useCrudFilters({
        url: '/tracking/boards',
        definitions: filterDefs,
        initialFilters: filters,
        initialSort: {
            sortBy: filters.sort_by ?? 'created_at',
            sortDirection: (filters.sort_direction ?? 'desc') as 'asc' | 'desc',
        },
    });

    const columns: DataTableColumn<BoardRow>[] = [
        {
            key: 'name',
            header: 'Board',
            sortable: true,
            sortKey: 'name',
            render: (board) =>
                board.show_url ? (
                    <a
                        href={board.show_url}
                        className="cursor-pointer font-medium underline-offset-4 hover:underline"
                    >
                        {board.name}
                    </a>
                ) : (
                    <span className="font-medium text-muted-foreground">
                        {board.name}
                    </span>
                ),
        },
        {
            key: 'client_project',
            header: 'Client / Project',
            className: 'hidden md:table-cell',
            render: (board) => {
                if (!board.client || !board.project) {
                    return <span>—</span>;
                }

                return (
                    <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-xs text-muted-foreground">
                            {board.client.name}
                        </span>
                        <span className="truncate text-sm font-medium">
                            {board.project.name}
                        </span>
                    </div>
                );
            },
        },
        {
            key: 'creator',
            header: 'Created by',
            className: 'hidden lg:table-cell',
            render: (board) =>
                board.creator ? (
                    <div className="flex items-center gap-2">
                        {board.creator.avatar_path ? (
                            <img
                                src={board.creator.avatar_path}
                                alt={board.creator.name}
                                className="size-6 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex size-6 items-center justify-center rounded-full bg-muted text-xs text-muted-foreground">
                                {board.creator.name.charAt(0)}
                            </div>
                        )}
                        <span className="truncate text-sm">
                            {board.creator.name}
                        </span>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
        },
        {
            key: 'columns_count',
            header: 'Columns',
            sortable: true,
            sortKey: 'columns_count',
            render: (board) => (
                <Badge variant="outline" className="gap-1">
                    <Columns3 className="size-3" />
                    {board.columns_count}
                </Badge>
            ),
        },
        {
            key: 'placements_count',
            header: 'Issues',
            sortable: true,
            sortKey: 'placements_count',
            className: 'hidden md:table-cell',
            render: (board) => (
                <Badge variant="outline" className="gap-1">
                    <Ticket className="size-3" />
                    {board.placements_count}
                </Badge>
            ),
        },
        {
            key: 'created_at',
            header: 'Created',
            sortable: true,
            sortKey: 'created_at',
            className: 'hidden lg:table-cell',
            render: (board) => (
                <span
                    className="text-xs text-muted-foreground"
                    title={
                        board.created_at
                            ? formatDetailedTimestamp(board.created_at)
                            : undefined
                    }
                >
                    {formatRelativeInstant(board.created_at)}
                </span>
            ),
        },
    ];

    const selectedRows = boards.filter((b) => selectedIds.includes(b.id));
    const anyUnmanageable = selectedRows.some((b) => !b.can_manage);

    const bulkActions = [
        {
            label: 'Open',
            disabled: selectedIds.length !== 1,
            disabledReason: 'Select exactly one board to open.',
            onClick: () => {
                const board = selectedRows[0];

                if (board?.show_url) {
                    router.visit(board.show_url);
                }
            },
        },
        {
            label: 'Edit',
            disabled: selectedIds.length !== 1 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to edit this board.'
                : 'Select exactly one board to edit.',
            onClick: () => {
                const board = selectedRows[0];

                if (board?.edit_url) {
                    window.location.assign(
                        `${board.edit_url}?return_to=${encodeURIComponent('/tracking/boards')}`,
                    );
                }
            },
        },
        {
            label: 'Delete',
            destructive: true,
            disabled: selectedIds.length === 0 || anyUnmanageable,
            disabledReason: anyUnmanageable
                ? 'You do not have permission to delete one or more selected boards.'
                : 'Select one or more boards.',
            onClick: () => setDeleteIds(selectedIds),
        },
    ];

    const confirmDelete = () => {
        if (!deleteIds || deleteIds.length === 0) {
            return;
        }

        router.delete('/tracking/boards/bulk-delete', {
            data: { board_ids: deleteIds },
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedIds([]);
                setDeleteIds(null);
            },
        });
    };

    const emptyText: React.ReactNode =
        crud.hasActiveFilters || (crud.filters.search as string)?.length > 0 ? (
            <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                    No boards match these filters.
                </p>
                <Button variant="link" size="sm" onClick={crud.clearFilters}>
                    Clear filters
                </Button>
            </div>
        ) : (
            <div className="flex flex-col items-center gap-1">
                <p className="text-sm text-muted-foreground">
                    No boards across your projects yet.
                </p>
                <p className="text-xs text-muted-foreground">
                    Boards created inside any project workspace will appear
                    here.
                </p>
            </div>
        );

    return (
        <>
            <Head title="Tracking Boards" />
            <CrudPage
                title="Tracking Boards"
                description="Cross-project board aggregation across all clients and projects."
            >
                <CrudFilters
                    definitions={filterDefs}
                    state={crud}
                    meta={`${pagination.total} board${pagination.total === 1 ? '' : 's'}`}
                />

                <DataTable
                    columns={columns}
                    rows={boards}
                    emptyText={emptyText}
                    getRowId={(board) => board.id}
                    selectedRowIds={selectedIds}
                    onSelectedRowIdsChange={setSelectedIds}
                    bulkActions={bulkActions}
                    currentSort={crud.sort}
                    onSortChange={crud.handleSortChange}
                    pagination={pagination}
                    onPageChange={crud.visitPage}
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
                                Delete board
                                {deleteIds && deleteIds.length === 1 ? '' : 's'}
                                ?
                            </DialogTitle>
                            <DialogDescription>
                                This will permanently remove{' '}
                                {deleteIds?.length ?? 0} board
                                {deleteIds && deleteIds.length === 1
                                    ? ''
                                    : 's'}{' '}
                                and all their columns and placements. This
                                cannot be undone.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
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

TrackingBoardsPage.layout = (page: React.ReactNode) => (
    <AppLayout>{page}</AppLayout>
);
