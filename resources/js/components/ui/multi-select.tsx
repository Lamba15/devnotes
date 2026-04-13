import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type MultiSelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

type MultiSelectProps = {
    values: string[];
    options: MultiSelectOption[];
    onValuesChange: (values: string[]) => void;
    placeholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
};

export function MultiSelect({
    values,
    options,
    onValuesChange,
    placeholder = 'Select options',
    emptyMessage = 'No options available.',
    disabled = false,
    className,
}: MultiSelectProps) {
    const selectedOptions = options.filter((option) => values.includes(option.value));
    const triggerLabel =
        selectedOptions.length === 0
            ? placeholder
            : selectedOptions.length <= 2
              ? selectedOptions.map((option) => option.label).join(', ')
              : `${selectedOptions.length} selected`;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={className ?? 'w-full justify-between'}
                >
                    <span className="truncate text-left">{triggerLabel}</span>
                    <ChevronDown className="size-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 w-(--radix-dropdown-menu-trigger-width) overflow-y-auto">
                {options.length > 0 ? (
                    <>
                        <DropdownMenuLabel>{placeholder}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {options.map((option) => (
                            <DropdownMenuCheckboxItem
                                key={option.value}
                                checked={values.includes(option.value)}
                                disabled={option.disabled}
                                onSelect={(event) => event.preventDefault()}
                                onCheckedChange={(checked) => {
                                    const nextValues = checked
                                        ? [...values, option.value]
                                        : values.filter((value) => value !== option.value);

                                    onValuesChange(Array.from(new Set(nextValues)));
                                }}
                            >
                                {option.label}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </>
                ) : (
                    <div className="px-2 py-4 text-sm text-muted-foreground">
                        {emptyMessage}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
