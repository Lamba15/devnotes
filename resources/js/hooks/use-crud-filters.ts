import type { FormDataConvertible, VisitOptions } from '@inertiajs/core';
import { router } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Filter definition types
// ---------------------------------------------------------------------------

export type CrudFilterDefinition =
    | {
          key: string;
          type: 'search';
          placeholder?: string;
      }
    | {
          key: string;
          type: 'select';
          placeholder?: string;
          label?: string;
          multi?: boolean;
          options: Array<{ label: string; value: string; count?: number }>;
          icon?: LucideIcon;
          className?: string;
      }
    | {
          key: string;
          type: 'date';
          placeholder?: string;
          label?: string;
          className?: string;
      };

// ---------------------------------------------------------------------------
// Hook options
// ---------------------------------------------------------------------------

export type UseCrudFiltersOptions = {
    /** Inertia route URL to visit when filters change. */
    url: string;

    /** Filter definitions – only used for computing active-filter metadata. */
    definitions: CrudFilterDefinition[];

    /**
     * The `filters` prop sent from the server on the current page.
     * This seeds the initial local state and keeps it in sync when the
     * server sends a fresh page (e.g. browser back/forward).
     */
    initialFilters: Record<string, unknown>;

    /** Initial sort state from the server's `filters` prop. */
    initialSort?: { sortBy: string; sortDirection: 'asc' | 'desc' };

    /** Fallback sort when nothing is provided. */
    defaultSort?: { sortBy: string; sortDirection: 'asc' | 'desc' };
};

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export type UseCrudFiltersReturn = {
    /** Current local filter values keyed by definition key. */
    filters: Record<string, unknown>;

    /** Set a single filter value. Triggers a visit to page 1. */
    setFilter: (key: string, value: unknown) => void;

    /** Replace the entire filters object at once. Triggers a visit to page 1. */
    setFilters: (next: Record<string, unknown>) => void;

    /** Clear all non-search filters (and optionally search). */
    clearFilters: () => void;

    /** Whether any filter (excluding search) has a non-empty value. */
    hasActiveFilters: boolean;

    /** Number of non-search filters with a non-empty value. */
    activeFilterCount: number;

    /** Current sort state. */
    sort: { sortBy: string; sortDirection: 'asc' | 'desc' };

    /** Set the sort state explicitly. */
    setSort: (next: { sortBy: string; sortDirection: 'asc' | 'desc' }) => void;

    /**
     * Sort-toggle handler designed to be passed to DataTable's `onSortChange`.
     * Clicking the same column flips direction; clicking a new column resets to asc.
     */
    handleSortChange: (sortKey: string) => void;

    /**
     * Navigate to a specific page while preserving current filters and sort.
     * Use as DataTable's `onPageChange`.
     */
    visitPage: (page: number) => void;

    /**
     * Serialize current state as a query params object.
     * Useful when a page needs to construct URLs manually.
     */
    buildQuery: (
        page?: number,
    ) => Record<string, string | string[] | number | undefined>;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isFilterActive(value: unknown): boolean {
    if (value === undefined || value === null || value === '') {
        return false;
    }

    if (Array.isArray(value) && value.length === 0) {
        return false;
    }

    return true;
}

function serializeFilters(
    filters: Record<string, unknown>,
): Record<string, string | string[] | number | undefined> {
    const params: Record<string, string | string[] | number | undefined> = {};

    for (const [key, value] of Object.entries(filters)) {
        if (isFilterActive(value)) {
            params[key] = value as string | string[] | number | undefined;
        }
    }

    return params;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCrudFilters({
    url,
    definitions,
    initialFilters,
    initialSort,
    defaultSort = { sortBy: 'created_at', sortDirection: 'desc' },
}: UseCrudFiltersOptions): UseCrudFiltersReturn {
    // ----- Filter state -----
    const [filters, setFiltersRaw] = useState<Record<string, unknown>>(() => {
        const seed: Record<string, unknown> = {};

        for (const def of definitions) {
            const initial = initialFilters[def.key];

            if (def.type === 'search') {
                seed[def.key] = typeof initial === 'string' ? initial : '';
            } else if (def.type === 'select') {
                if (def.multi !== false) {
                    seed[def.key] = Array.isArray(initial) ? initial : [];
                } else {
                    seed[def.key] = typeof initial === 'string' ? initial : '';
                }
            } else if (def.type === 'date') {
                seed[def.key] = typeof initial === 'string' ? initial : '';
            }
        }

        return seed;
    });

    // ----- Sort state -----
    const [sort, setSort] = useState<{
        sortBy: string;
        sortDirection: 'asc' | 'desc';
    }>(() => ({
        sortBy: initialSort?.sortBy ?? defaultSort.sortBy,
        sortDirection: initialSort?.sortDirection ?? defaultSort.sortDirection,
    }));

    // ----- Build query params -----
    const buildQuery = useCallback(
        (
            page?: number,
        ): Record<string, string | string[] | number | undefined> => {
            const params: Record<
                string,
                string | string[] | number | undefined
            > = {
                ...serializeFilters(filters),
                sort_by: sort.sortBy,
                sort_direction: sort.sortDirection,
            };

            if (page !== undefined && page > 1) {
                params.page = page;
            }

            return params;
        },
        [filters, sort],
    );

    // ----- Visit helper -----
    const visitOptions: VisitOptions = {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    };

    const visit = useCallback(
        (page = 1) => {
            router.get(
                url,
                buildQuery(page) as Record<string, FormDataConvertible>,
                visitOptions,
            );
        },
        [url, buildQuery],
    );

    // ----- Track whether we should skip the initial visit -----
    const isFirstRender = useRef(true);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;

            return;
        }

        // When filters or sort change → always go to page 1
        visit(1);
    }, [filters, sort]); // eslint-disable-line react-hooks/exhaustive-deps
    // `visit` is intentionally excluded — we only want to react to
    // filter/sort value changes, not the function reference itself.

    // ----- Public setters -----
    const setFilter = useCallback((key: string, value: unknown) => {
        setFiltersRaw((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setFilters = useCallback((next: Record<string, unknown>) => {
        setFiltersRaw(next);
    }, []);

    const clearFilters = useCallback(() => {
        const cleared: Record<string, unknown> = {};

        for (const def of definitions) {
            if (def.type === 'search') {
                cleared[def.key] = '';
            } else if (def.type === 'select') {
                cleared[def.key] = def.multi !== false ? [] : '';
            } else if (def.type === 'date') {
                cleared[def.key] = '';
            }
        }

        setFiltersRaw(cleared);
    }, [definitions]);

    // ----- Sort handler (for DataTable) -----
    const handleSortChange = useCallback((sortKey: string) => {
        setSort((prev) => {
            if (prev.sortBy === sortKey) {
                return {
                    sortBy: sortKey,
                    sortDirection:
                        prev.sortDirection === 'asc' ? 'desc' : 'asc',
                };
            }

            return { sortBy: sortKey, sortDirection: 'asc' };
        });
    }, []);

    // ----- Active filter metadata -----
    const activeFilterCount = definitions.filter(
        (def) => def.type !== 'search' && isFilterActive(filters[def.key]),
    ).length;

    const hasActiveFilters = activeFilterCount > 0;

    // ----- Pagination -----
    const visitPage = useCallback(
        (page: number) => {
            visit(page);
        },
        [visit],
    );

    return {
        filters,
        setFilter,
        setFilters,
        clearFilters,
        hasActiveFilters,
        activeFilterCount,
        sort,
        setSort,
        handleSortChange,
        visitPage,
        buildQuery,
    };
}
