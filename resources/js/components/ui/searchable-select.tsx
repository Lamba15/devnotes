import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
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
}: SearchableSelectProps) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);

    const selectedValue = isControlled ? value : internalValue;
    const selectedOption = options.find((option) => option.value === selectedValue);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();

        if (normalizedQuery === '') {
            return options;
        }

        return options.filter((option) =>
            option.label.toLowerCase().includes(normalizedQuery),
        );
    }, [options, query]);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    function selectValue(nextValue: string) {
        if (!isControlled) {
            setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
        setIsOpen(false);
        setQuery('');
    }

    return (
        <div ref={rootRef} className={cn('relative', className)}>
            {name ? <input type="hidden" name={name} value={selectedValue} /> : null}

            <button
                id={id}
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen((open) => !open)}
                className={cn(
                    'border-input bg-background ring-offset-background focus-visible:ring-ring/50 flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
                    !selectedOption && 'text-muted-foreground',
                )}
            >
                <span className="truncate">{selectedOption?.label ?? placeholder}</span>
                <ChevronDown className="size-4 opacity-50" />
            </button>

            {isOpen ? (
                <div className="bg-popover text-popover-foreground absolute z-50 mt-2 w-full rounded-md border shadow-md">
                    <div className="border-b p-2">
                        <div className="relative">
                            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search..."
                                className="pl-9"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto p-1">
                        <button
                            type="button"
                            onClick={() => selectValue('')}
                            className={cn(
                                'hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm',
                                selectedValue === '' && 'bg-accent text-accent-foreground',
                            )}
                        >
                            <span className="flex-1 truncate">{placeholder}</span>
                            {selectedValue === '' ? <Check className="size-4" /> : null}
                        </button>

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => selectValue(option.value)}
                                    className={cn(
                                        'hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm',
                                        option.value === selectedValue && 'bg-accent text-accent-foreground',
                                    )}
                                >
                                    <span className="flex-1 truncate">{option.label}</span>
                                    {option.value === selectedValue ? <Check className="size-4" /> : null}
                                </button>
                            ))
                        ) : (
                            <p className="text-muted-foreground px-2 py-2 text-sm">{emptyMessage}</p>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
