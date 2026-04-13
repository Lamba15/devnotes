import { ChevronDown, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactSelect, { components } from 'react-select';
import CreatableReactSelect from 'react-select/creatable';
import type {
    ClearIndicatorProps,
    ControlProps,
    DropdownIndicatorProps,
    GroupBase,
} from 'react-select';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
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
    isSearchable?: boolean;
    isClearable?: boolean;
    isCreatable?: boolean;
    size?: 'sm' | 'default' | 'lg';
    'data-testid'?: string;
};

const sizeClasses = {
    sm: {
        control: 'min-h-8',
        valueContainer: 'px-2.5 py-0.5',
        indicator: 'p-1.5',
        icon: 'size-3.5',
    },
    default: {
        control: 'min-h-9',
        valueContainer: 'px-3 py-1',
        indicator: 'p-2',
        icon: 'size-4',
    },
    lg: {
        control: 'min-h-10',
        valueContainer: 'px-3 py-1.5',
        indicator: 'p-2',
        icon: 'size-4',
    },
} as const;

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
    isSearchable = true,
    isClearable = true,
    isCreatable = false,
    size = 'default',
    'data-testid': dataTestId,
}: SearchableSelectProps) {
    const resolvedOptions = Array.isArray(options) ? options : [];
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState(defaultValue);
    const selectedValue = isControlled ? value ?? '' : internalValue;
    const selectedOption = selectedValue
        ? resolvedOptions.find((option) => option.value === selectedValue) ?? {
              value: selectedValue,
              label: selectedValue,
          }
        : null;
    const normalizedOptions =
        selectedOption &&
        !resolvedOptions.some((option) => option.value === selectedOption.value)
            ? [selectedOption, ...resolvedOptions]
            : resolvedOptions;
    const sizing = sizeClasses[size];

    const selectComponents = useMemo(
        () => ({
            IndicatorSeparator: () => null,
            Control: (
                props: ControlProps<SearchableSelectOption, false, GroupBase<SearchableSelectOption>>,
            ) => (
                <components.Control
                    {...props}
                    innerProps={{
                        ...props.innerProps,
                        ...(dataTestId
                            ? ({ 'data-testid': dataTestId } as Record<
                                  string,
                                  string
                              >)
                            : {}),
                    }}
                >
                    {Icon ? (
                        <Icon
                            className={cn(
                                'shrink-0 text-muted-foreground',
                                sizing.icon,
                            )}
                        />
                    ) : null}
                    {props.children}
                </components.Control>
            ),
            DropdownIndicator: (
                props: DropdownIndicatorProps<
                    SearchableSelectOption,
                    false,
                    GroupBase<SearchableSelectOption>
                >,
            ) => (
                <components.DropdownIndicator {...props}>
                    <ChevronDown
                        className={cn(
                            'shrink-0 opacity-50',
                            sizing.icon,
                        )}
                    />
                </components.DropdownIndicator>
            ),
            ClearIndicator: (
                props: ClearIndicatorProps<
                    SearchableSelectOption,
                    false,
                    GroupBase<SearchableSelectOption>
                >,
            ) => (
                <components.ClearIndicator {...props}>
                    <X className={cn('shrink-0', sizing.icon)} />
                </components.ClearIndicator>
            ),
        }),
        [Icon, dataTestId, sizing.icon],
    );

    const sharedProps = {
        unstyled: true,
        inputId: id,
        instanceId: id ?? name ?? placeholder,
        name,
        value: selectedOption,
        options: normalizedOptions,
        placeholder,
        isDisabled: disabled,
        isSearchable,
        isClearable,
        noOptionsMessage: () => emptyMessage,
        menuPortalTarget:
            typeof window === 'undefined' ? undefined : document.body,
        menuPosition: 'fixed' as const,
        menuShouldBlockScroll: false,
        closeMenuOnScroll: true,
        captureMenuScroll: false,
        className,
        classNames: {
            control: (state: { isFocused: boolean; isDisabled: boolean }) =>
                cn(
                    'border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] outline-none',
                    'flex w-full items-center gap-2 rounded-md border',
                    sizing.control,
                    state.isFocused && 'border-ring ring-ring/50 ring-[3px]',
                    state.isDisabled &&
                        'cursor-not-allowed opacity-50 pointer-events-none',
                ),
            valueContainer: () => cn('gap-2 text-sm', sizing.valueContainer),
            placeholder: () => 'm-0 text-sm text-muted-foreground',
            singleValue: () => 'm-0 text-sm text-foreground',
            input: () => 'm-0 p-0 text-sm text-foreground',
            indicatorsContainer: () => 'self-stretch',
            clearIndicator: () =>
                cn(
                    'text-muted-foreground transition-colors hover:text-foreground',
                    sizing.indicator,
                ),
            dropdownIndicator: () =>
                cn(
                    'text-muted-foreground transition-colors hover:text-foreground',
                    sizing.indicator,
                ),
            menu: () =>
                'z-[100] mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md',
            menuList: () => 'max-h-56 p-1',
            option: (state: { isSelected: boolean; isFocused: boolean }) =>
                cn(
                    'cursor-pointer rounded-sm px-2 py-1.5 text-sm transition-colors',
                    state.isSelected && 'bg-accent text-accent-foreground',
                    !state.isSelected &&
                        state.isFocused &&
                        'bg-accent/70 text-accent-foreground',
                    !state.isFocused &&
                        !state.isSelected &&
                        'text-foreground',
                ),
            noOptionsMessage: () =>
                'px-2 py-4 text-center text-sm text-muted-foreground',
        },
        styles: {
            menuPortal: (base: Record<string, unknown>) => ({
                ...base,
                zIndex: 100,
            }),
        },
        components: selectComponents,
        onChange: (nextOption: SearchableSelectOption | null) => {
            const nextValue = nextOption?.value ?? '';

            if (!isControlled) {
                setInternalValue(nextValue);
            }

            onValueChange?.(nextValue);
        },
    };

    if (isCreatable) {
        return (
            <CreatableReactSelect<SearchableSelectOption, false>
                {...sharedProps}
                formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
            />
        );
    }

    return (
        <ReactSelect<SearchableSelectOption, false>
            {...sharedProps}
        />
    );
}
