import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type SearchableSelectOption = {
    value: string;
    label: string;
};

type SearchableSelectProps = {
    id?: string;
    name?: string;
    value?: string;
    defaultValue?: string;
    placeholder?: string;
    options: SearchableSelectOption[];
    disabled?: boolean;
    onValueChange?: (value: string) => void;
    className?: string;
    emptyMessage?: string;
    icon?: LucideIcon;
};

export function SearchableSelect({
    id,
    name,
    value,
    defaultValue = '',
    placeholder = 'Select an option',
    options,
    disabled = false,
    onValueChange,
    className,
    emptyMessage = 'No options found.',
    icon: Icon,
}: SearchableSelectProps) {
    const resolvedOptions = Array.isArray(options) ? options : [];
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const [dropdownStyle, setDropdownStyle] = useState<{
        top: number;
        left: number;
        width: number;
        listMaxHeight: number;
        placement: 'top' | 'bottom';
    } | null>(null);

    const selectedValue = isControlled ? value : internalValue;
    const selectedOption = resolvedOptions.find(
        (option) => option.value === selectedValue,
    );

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
            return resolvedOptions;
        }

        return resolvedOptions.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
        );
    }, [resolvedOptions, query]);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            const target = event.target as Node;

            if (
                !rootRef.current?.contains(target) &&
                !dropdownRef.current?.contains(target)
            ) {
                setIsOpen(false);
                setQuery('');
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    useEffect(() => {
        if (isOpen && searchRef.current) {
            searchRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setDropdownStyle(null);

            return;
        }

        const updateDropdownStyle = () => {
            const rect = triggerRef.current?.getBoundingClientRect();

            if (!rect) {
                return;
            }

            const viewportPadding = 8;
            const dropdownGap = 4;
            const headerHeight = 46;
            const preferredListHeight = 224;
            const minListHeight = 96;
            const availableBelow =
                window.innerHeight - rect.bottom - viewportPadding - dropdownGap;
            const availableAbove = rect.top - viewportPadding - dropdownGap;
            const placement =
                availableBelow < preferredListHeight &&
                availableAbove > availableBelow
                    ? 'top'
                    : 'bottom';
            const availableSpace =
                placement === 'top' ? availableAbove : availableBelow;
            const listMaxHeight = Math.max(
                minListHeight,
                Math.min(preferredListHeight, availableSpace - headerHeight),
            );
            const panelHeight = headerHeight + listMaxHeight;

            setDropdownStyle({
                top:
                    placement === 'top'
                        ? Math.max(viewportPadding, rect.top - panelHeight - dropdownGap)
                        : rect.bottom + dropdownGap,
                left: rect.left,
                width: rect.width,
                listMaxHeight,
                placement,
            });
        };

        updateDropdownStyle();

        window.addEventListener('resize', updateDropdownStyle);
        window.addEventListener('scroll', updateDropdownStyle, true);

        return () => {
            window.removeEventListener('resize', updateDropdownStyle);
            window.removeEventListener('scroll', updateDropdownStyle, true);
        };
    }, [isOpen]);

    function selectValue(nextValue: string) {
        if (!isControlled) {
            setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
        setIsOpen(false);
        setQuery('');
    }

    function handleClear(e: React.MouseEvent) {
        e.stopPropagation();
        selectValue('');
    }

    const hasValue = selectedValue !== '';

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            {name ? <input type="hidden" name={name} value={selectedValue} /> : null}

            <button
                id={id}
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
                className={cn(
                    'border-input ring-offset-background focus-visible:ring-ring/50 flex h-9 w-full items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-colors focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    !selectedOption && 'text-muted-foreground',
                    isOpen && 'ring-ring/50 border-ring ring-[3px]',
                )}
            >
                {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" /> : null}
                <span className="flex-1 truncate text-left">
                    {selectedOption?.label ?? placeholder}
                </span>
                {hasValue ? (
                    <X
                        className="size-3.5 shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                        onClick={handleClear}
                    />
                ) : (
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                )}
            </button>

            {isOpen && dropdownStyle && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={dropdownRef}
                          className={cn(
                              'bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 fixed z-[100] rounded-md border shadow-md',
                              dropdownStyle.placement === 'top'
                                  ? 'origin-bottom'
                                  : 'origin-top',
                          )}
                          style={{
                              top: dropdownStyle.top,
                              left: dropdownStyle.left,
                              width: dropdownStyle.width,
                          }}
                      >
                          <div className="border-b p-1.5">
                              <div className="relative">
                                  <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                                  <input
                                      ref={searchRef}
                                      value={query}
                                      onChange={(event) =>
                                          setQuery(event.target.value)
                                      }
                                      placeholder="Search..."
                                      className="placeholder:text-muted-foreground h-8 w-full rounded-sm bg-transparent pl-8 pr-3 text-sm outline-none"
                                  />
                              </div>
                          </div>

                          <div
                              className="overflow-y-auto p-1"
                              style={{
                                  maxHeight: dropdownStyle.listMaxHeight,
                              }}
                          >
                              {!query && (
                                  <button
                                      type="button"
                                      onClick={() => selectValue('')}
                                      className={cn(
                                          'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                                          selectedValue === '' &&
                                              'bg-accent text-accent-foreground',
                                      )}
                                  >
                                      <span className="flex-1 truncate text-muted-foreground">
                                          {placeholder}
                                      </span>
                                      {selectedValue === '' ? (
                                          <Check className="size-3.5 shrink-0" />
                                      ) : null}
                                  </button>
                              )}

                              {filteredOptions.length > 0 ? (
                                  filteredOptions.map((option) => (
                                      <button
                                          key={option.value}
                                          type="button"
                                          onClick={() =>
                                              selectValue(option.value)
                                          }
                                          className={cn(
                                              'hover:bg-accent hover:text-accent-foreground flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors',
                                              option.value === selectedValue &&
                                                  'bg-accent text-accent-foreground',
                                          )}
                                      >
                                          <span className="flex-1 truncate">
                                              {option.label}
                                          </span>
                                          {option.value === selectedValue ? (
                                              <Check className="size-3.5 shrink-0" />
                                          ) : null}
                                      </button>
                                  ))
                              ) : (
                                  <p className="text-muted-foreground px-2 py-4 text-center text-sm">
                                      {emptyMessage}
                                  </p>
                              )}
                          </div>
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}
