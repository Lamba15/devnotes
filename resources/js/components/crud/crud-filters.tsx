import { Search, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { FilterBar } from '@/components/crud/filter-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { CrudFilterDefinition } from '@/hooks/use-crud-filters';
import type { UseCrudFiltersReturn } from '@/hooks/use-crud-filters';

export function CrudFilters({
    definitions,
    state,
    meta,
    children,
}: {
    /** The same definitions array passed to `useCrudFilters`. */
    definitions: CrudFilterDefinition[];

    /** The return value of `useCrudFilters`. */
    state: UseCrudFiltersReturn;

    /** Optional trailing content for the meta slot (e.g. result count). */
    meta?: React.ReactNode;

    /** Optional extra controls rendered alongside the standard filters. */
    children?: ReactNode;
}) {
    const searchDef = definitions.find((d) => d.type === 'search');
    const selectDefs = definitions.filter((d) => d.type === 'select');

    const metaContent = (
        <div className="flex items-center gap-2">
            {state.hasActiveFilters ? (
                <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={state.clearFilters}
                >
                    <X className="mr-1 size-3.5" />
                    Clear filters
                </Button>
            ) : null}
            {meta ? (
                <span className="text-sm text-muted-foreground">{meta}</span>
            ) : null}
        </div>
    );

    return (
        <FilterBar meta={metaContent}>
            <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                {searchDef ? (
                    <div className="relative md:max-w-sm">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            value={
                                (state.filters[searchDef.key] as string) ?? ''
                            }
                            onChange={(event) =>
                                state.setFilter(
                                    searchDef.key,
                                    event.target.value,
                                )
                            }
                            placeholder={searchDef.placeholder ?? 'Search...'}
                            className="pl-9"
                        />
                    </div>
                ) : null}
                {selectDefs.map((def) => {
                    if (def.type !== 'select') {
                        return null;
                    }

                    const isMulti = def.multi !== false;
                    const sharedProps = {
                        className: def.className ?? 'lg:w-44',
                        size: 'lg' as const,
                        placeholder: def.placeholder ?? def.label ?? def.key,
                        options: def.options,
                        ...(def.icon ? { icon: def.icon } : {}),
                    };

                    if (isMulti) {
                        return (
                            <SearchableSelect
                                key={def.key}
                                {...sharedProps}
                                isMulti
                                value={
                                    (state.filters[def.key] as string[]) ?? []
                                }
                                onValueChange={(value: string[]) =>
                                    state.setFilter(def.key, value)
                                }
                            />
                        );
                    }

                    return (
                        <SearchableSelect
                            key={def.key}
                            {...sharedProps}
                            value={(state.filters[def.key] as string) ?? ''}
                            onValueChange={(value: string) =>
                                state.setFilter(def.key, value)
                            }
                        />
                    );
                })}
                {children}
            </div>
        </FilterBar>
    );
}
