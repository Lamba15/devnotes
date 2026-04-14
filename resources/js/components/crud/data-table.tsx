import { ArrowDown, ArrowUp, ChevronsUpDown, Inbox } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
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

function buildVisiblePages(
    currentPage: number,
    lastPage: number,
): Array<number | 'ellipsis'> {
    if (lastPage <= 7) {
        return Array.from({ length: lastPage }, (_, index) => index + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, 4, 5, 'ellipsis', lastPage];
    }

    if (currentPage >= lastPage - 2) {
        return [
            1,
            'ellipsis',
            lastPage - 4,
            lastPage - 3,
            lastPage - 2,
            lastPage - 1,
            lastPage,
        ];
    }

    return [
        1,
        'ellipsis',
        currentPage - 1,
        currentPage,
        currentPage + 1,
        'ellipsis',
        lastPage,
    ];
}

/**
 * Tracks the bounding rect of an element using ResizeObserver + scroll,
 * returning its left offset and width so a fixed-position bar can align.
 */
function useElementRect(ref: React.RefObject<HTMLElement | null>) {
    const [rect, setRect] = useState<{ left: number; width: number } | null>(
        null,
    );

    const update = useCallback(() => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        setRect({ left: r.left, width: r.width });
    }, [ref]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        update();

        const ro = new ResizeObserver(update);
        ro.observe(el);

        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update, { passive: true });

        return () => {
            ro.disconnect();
            window.removeEventListener('scroll', update);
            window.removeEventListener('resize', update);
        };
    }, [ref, update]);

    return rect;
}

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
    const showSelectionBar = selectable && selectedIds.length > 0;
    const rowIds =
        selectable && getRowId ? rows.map((row) => getRowId(row)) : [];
    const allSelected =
        selectable &&
        rowIds.length > 0 &&
        rowIds.every((id) => selectedIds.includes(id));
    const visiblePages = pagination
        ? buildVisiblePages(pagination.current_page, pagination.last_page)
        : [];

    const toggleRowSelection = useCallback(
        (rowId: string | number) => {
            if (!onSelectedRowIdsChange) {
                return;
            }

            onSelectedRowIdsChange(
                selectedIds.includes(rowId)
                    ? selectedIds.filter((id) => id !== rowId)
                    : [...selectedIds, rowId],
            );
        },
        [onSelectedRowIdsChange, selectedIds],
    );

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const rect = useElementRect(tableContainerRef);

    return (
        <div className="space-y-4">
            <div
                ref={tableContainerRef}
                className="overflow-hidden rounded-xl bg-card shadow-sm"
            >
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted">
                        <tr>
                            {selectable ? (
                                <th className="w-12 px-3 py-3 text-center align-middle text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    <div className="mx-auto flex size-9 items-center justify-center rounded-md">
                                        <Checkbox
                                            className="border-foreground/40 data-[state=checked]:border-primary"
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
                                    className="px-4 py-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                                >
                                    {column.sortable &&
                                    column.sortKey &&
                                    onSortChange ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onSortChange(column.sortKey!)
                                            }
                                            className="inline-flex cursor-pointer items-center gap-2"
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
                            <tr
                                key={getRowId ? getRowId(row) : index}
                                className="border-t border-border/50 transition-colors hover:bg-muted/30"
                                onDoubleClick={() => {
                                    if (!selectable || !getRowId) {
                                        return;
                                    }

                                    toggleRowSelection(getRowId(row));
                                }}
                            >
                                {selectable && getRowId ? (
                                    <td className="w-12 px-3 py-3 align-middle">
                                        <div className="mx-auto flex size-9 items-center justify-center rounded-md">
                                            <Checkbox
                                                className="border-foreground/40 data-[state=checked]:border-primary"
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

                                                    if (checked) {
                                                        toggleRowSelection(
                                                            rowId,
                                                        );

                                                        return;
                                                    }

                                                    onSelectedRowIdsChange(
                                                        selectedIds.filter(
                                                            (id) =>
                                                                id !== rowId,
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

            {/* Fixed bulk-action bar, portaled to body so it's viewport-relative */}
            {createPortal(
                <AnimatePresence>
                    {showSelectionBar && rect ? (
                        <motion.div
                            initial={{ y: 80, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 80, opacity: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 400,
                                damping: 30,
                            }}
                            className="fixed bottom-5 z-50"
                            style={{
                                left: rect.left,
                                width: rect.width,
                            }}
                        >
                            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-card/95 px-4 py-3 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-card/85">
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="font-medium text-foreground">
                                        {selectedIds.length} selected
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            onSelectedRowIdsChange?.([])
                                        }
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
                        </motion.div>
                    ) : null}
                </AnimatePresence>,
                document.body,
            )}

            {pagination && pagination.last_page > 1 ? (
                <div className="flex flex-col gap-3 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
                    <p className="text-muted-foreground">
                        Page {pagination.current_page} of {pagination.last_page}{' '}
                        · {pagination.total} total
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
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
                        <div className="flex flex-wrap items-center gap-1">
                            {visiblePages.map((page, index) =>
                                page === 'ellipsis' ? (
                                    <span
                                        key={`ellipsis-${index}`}
                                        className="px-1 text-muted-foreground"
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <Button
                                        key={page}
                                        variant={
                                            page === pagination.current_page
                                                ? 'default'
                                                : 'outline'
                                        }
                                        size="sm"
                                        onClick={() => onPageChange?.(page)}
                                    >
                                        {page}
                                    </Button>
                                ),
                            )}
                        </div>
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

            {showSelectionBar ? <div aria-hidden className="h-24" /> : null}
        </div>
    );
}
