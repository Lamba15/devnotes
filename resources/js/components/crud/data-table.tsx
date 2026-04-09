import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ActionDropdownItem } from '@/components/crud/action-dropdown';
import { ActionDropdown } from '@/components/crud/action-dropdown';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export type DataTableColumn<T> = {
    key: string;
    header: string;
    render: (item: T) => ReactNode;
    sortable?: boolean;
    sortKey?: string;
};

type PaginationMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
};

export function DataTable<T>({
    columns,
    rows,
    emptyText = 'No records yet.',
    getRowId,
    selectedRowIds,
    onSelectedRowIdsChange,
    bulkActions,
    currentSort,
    onSortChange,
    pagination,
    onPageChange,
}: {
    columns: DataTableColumn<T>[];
    rows: T[];
    emptyText?: string;
    getRowId?: (row: T) => string | number;
    selectedRowIds?: Array<string | number>;
    onSelectedRowIdsChange?: (ids: Array<string | number>) => void;
    bulkActions?: ActionDropdownItem[];
    currentSort?: { sortBy: string; sortDirection: 'asc' | 'desc' };
    onSortChange?: (sortBy: string) => void;
    pagination?: PaginationMeta;
    onPageChange?: (page: number) => void;
}) {
    const selectable = Boolean(getRowId && onSelectedRowIdsChange);
    const selectedIds = selectedRowIds ?? [];
    const rowIds =
        selectable && getRowId ? rows.map((row) => getRowId(row)) : [];
    const allSelected =
        selectable &&
        rowIds.length > 0 &&
        rowIds.every((id) => selectedIds.includes(id));

    return (
        <div className="space-y-3">
            <div className="overflow-hidden rounded-xl bg-card shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                        <tr>
                            {selectable ? (
                                <th className="w-12 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <div className="flex items-center justify-center">
                                        <Checkbox
                                            checked={allSelected || false}
                                            onCheckedChange={(checked) => {
                                                if (!onSelectedRowIdsChange) {
                                                    return;
                                                }

                                                onSelectedRowIdsChange(
                                                    checked ? rowIds : [],
                                                );
                                            }}
                                        />
                                    </div>
                                </th>
                            ) : null}
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                                >
                                    {column.sortable &&
                                    column.sortKey &&
                                    onSortChange ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSortChange(column.sortKey!)
                                            }
                                            className="inline-flex items-center gap-2"
                                        >
                                            <span>{column.header}</span>
                                            {currentSort?.sortBy ===
                                            column.sortKey ? (
                                                currentSort.sortDirection ===
                                                'asc' ? (
                                                    <ArrowUp className="h-4 w-4" />
                                                ) : (
                                                    <ArrowDown className="h-4 w-4" />
                                                )
                                            ) : (
                                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                                            )}
                                        </button>
                                    ) : (
                                        column.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index} className="border-t border-border/50 transition-colors hover:bg-muted/30">
                                {selectable && getRowId ? (
                                    <td className="px-4 py-3 align-middle">
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={selectedIds.includes(
                                                    getRowId(row),
                                                )}
                                                onCheckedChange={(checked) => {
                                                    if (
                                                        !onSelectedRowIdsChange
                                                    ) {
                                                        return;
                                                    }

                                                    const rowId = getRowId(row);

                                                    onSelectedRowIdsChange(
                                                        checked
                                                            ? [
                                                                  ...selectedIds,
                                                                  rowId,
                                                              ]
                                                            : selectedIds.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      rowId,
                                                              ),
                                                    );
                                                }}
                                            />
                                        </div>
                                    </td>
                                ) : null}
                                {columns.map((column) => (
                                    <td key={column.key} className="px-4 py-3">
                                        {column.render(row)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {rows.length === 0 ? (
                            <tr>
                                <td
                                    className="px-4 py-12 text-center"
                                    colSpan={
                                        columns.length + (selectable ? 1 : 0)
                                    }
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <Inbox className="size-8 text-muted-foreground/50" />
                                        <p className="text-sm text-muted-foreground">
                                            {emptyText}
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {selectable && selectedIds.length > 0 ? (
                <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 rounded-xl bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="font-medium text-foreground">
                            {selectedIds.length} selected
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectedRowIdsChange?.([])}
                        >
                            Clear selection
                        </Button>
                    </div>

                    {bulkActions?.length ? (
                        <ActionDropdown
                            items={bulkActions}
                            label="Actions"
                            variant="outline"
                            side="top"
                        />
                    ) : null}
                </div>
            ) : null}

            {pagination && pagination.last_page > 1 ? (
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                    <p className="text-muted-foreground">
                        Page {pagination.current_page} of {pagination.last_page}{' '}
                        · {pagination.total} total
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() =>
                                onPageChange?.(pagination.current_page - 1)
                            }
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={
                                pagination.current_page >= pagination.last_page
                            }
                            onClick={() =>
                                onPageChange?.(pagination.current_page + 1)
                            }
                        >
                            Next
                        </Button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
