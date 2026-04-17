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
    MultiValue,
    SingleValue,
} from 'react-select';
import { cn } from '@/lib/utils';

export type SearchableSelectOption = {
    value: string;
    label: string;
    /** Optional count; when present, rendered as a bubble next to the label. */
    count?: number;
};

type SearchableSelectBaseProps = {
    id?: string;
    name?: string;
    placeholder?: string;
    options: SearchableSelectOption[];
    disabled?: boolean;
    className?: string;
    emptyMessage?: string;
    icon?: LucideIcon;
    isSearchable?: boolean;
    isClearable?: boolean;
    isCreatable?: boolean;
    size?: 'sm' | 'default' | 'lg';
    'data-testid'?: string;
};

type SearchableSelectSingleProps = SearchableSelectBaseProps & {
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    isMulti?: false;
};

type SearchableSelectMultiProps = SearchableSelectBaseProps & {
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
    isMulti: true;
};

type SearchableSelectProps =
    | SearchableSelectSingleProps
    | SearchableSelectMultiProps;

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
    isMulti = false,
    size = 'default',
    'data-testid': dataTestId,
}: SearchableSelectProps) {
    const resolvedOptions = Array.isArray(options) ? options : [];
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = useState<string | string[]>(
        defaultValue ?? (isMulti ? [] : ''),
    );
    const selectedValue = isControlled
        ? value ?? (isMulti ? [] : '')
        : internalValue;
    const selectedValues = isMulti
        ? Array.isArray(selectedValue)
            ? selectedValue
            : selectedValue
              ? [selectedValue]
              : []
        : [];
    const selectedOption = !isMulti
        ? typeof selectedValue === 'string' && selectedValue
            ? resolvedOptions.find((option) => option.value === selectedValue) ?? {
                  value: selectedValue,
                  label: selectedValue,
              }
            : null
        : null;
    const selectedOptions = isMulti
        ? selectedValues.map(
              (selectedItem) =>
                  resolvedOptions.find((option) => option.value === selectedItem) ?? {
                      value: selectedItem,
                      label: selectedItem,
                  },
          )
        : [];
    const normalizedOptions = Array.from(
        new Map(
            [...selectedOptions, ...(selectedOption ? [selectedOption] : []), ...resolvedOptions].map(
                (option) => [option.value, option],
            ),
        ).values(),
    );
    const sizing = sizeClasses[size];

    const selectComponents = useMemo(
        () => ({
            IndicatorSeparator: () => null,
            Control: (
                props: ControlProps<SearchableSelectOption, boolean, GroupBase<SearchableSelectOption>>,
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
                                'ml-3 shrink-0 text-muted-foreground',
                                isMulti && selectedValues.length > 0 && 'self-start mt-2',
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
                    boolean,
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
                    boolean,
                    GroupBase<SearchableSelectOption>
                >,
            ) => (
                <components.ClearIndicator {...props}>
                    <X className={cn('shrink-0', sizing.icon)} />
                </components.ClearIndicator>
            ),
        }),
        [Icon, dataTestId, isMulti, selectedValues.length, sizing.icon],
    );

    const hasCounts = normalizedOptions.some(
        (option) => typeof option.count === 'number',
    );
    const formatOptionLabel = hasCounts
        ? (option: SearchableSelectOption, meta: { context: string }) => {
              if (meta.context === 'value') {
                  return <span>{option.label}</span>;
              }

              return (
                  <span className="flex min-w-0 items-center justify-between gap-2">
                      <span className="min-w-0 truncate">{option.label}</span>
                      {typeof option.count === 'number' ? (
                          <span
                              className={cn(
                                  'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums',
                                  option.count > 0
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-muted text-muted-foreground',
                              )}
                          >
                              {option.count}
                          </span>
                      ) : null}
                  </span>
              );
          }
        : undefined;

    const sharedProps = {
        unstyled: true,
        inputId: id,
        instanceId: id ?? name ?? placeholder,
        name,
        value: isMulti ? selectedOptions : selectedOption,
        options: normalizedOptions,
        placeholder,
        isDisabled: disabled,
        isSearchable,
        isClearable,
        isMulti,
        noOptionsMessage: () => emptyMessage,
        menuPortalTarget:
            typeof window === 'undefined' ? undefined : document.body,
        menuPosition: 'fixed' as const,
        menuShouldBlockScroll: false,
        closeMenuOnScroll: true,
        captureMenuScroll: false,
        closeMenuOnSelect: !isMulti,
        hideSelectedOptions: false,
        className,
        classNames: {
            control: (state: { isFocused: boolean; isDisabled: boolean }) =>
                cn(
                    'border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] outline-none',
                    'flex w-full items-center gap-2 rounded-md border',
                    isMulti && 'py-0.5',
                    sizing.control,
                    state.isFocused && 'border-ring ring-ring/50 ring-[3px]',
                    state.isDisabled &&
                        'cursor-not-allowed opacity-50 pointer-events-none',
                ),
            valueContainer: () => cn('gap-2 text-sm', sizing.valueContainer),
            placeholder: () => 'm-0 text-sm text-muted-foreground',
            singleValue: () => 'm-0 text-sm text-foreground',
            multiValue: () =>
                'm-0 items-center gap-1 rounded bg-accent px-1.5 py-0.5 text-accent-foreground',
            multiValueLabel: () => 'px-0 py-0 text-xs font-medium',
            multiValueRemove: () =>
                'rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground',
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
        formatOptionLabel,
        onChange: (
            nextOption:
                | MultiValue<SearchableSelectOption>
                | SingleValue<SearchableSelectOption>,
        ) => {
            const nextValue = isMulti
                ? (nextOption as MultiValue<SearchableSelectOption>).map(
                      (option) => option.value,
                  )
                : ((nextOption as SingleValue<SearchableSelectOption>)?.value ?? '');

            if (!isControlled) {
                setInternalValue(nextValue);
            }

            if (isMulti) {
                (onValueChange as ((value: string[]) => void) | undefined)?.(
                    nextValue as string[],
                );

                return;
            }

            (onValueChange as ((value: string) => void) | undefined)?.(
                nextValue as string,
            );
        },
    };

    if (isCreatable) {
        return (
            <CreatableReactSelect<SearchableSelectOption, boolean>
                {...sharedProps}
                formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
            />
        );
    }

    return (
        <ReactSelect<SearchableSelectOption, boolean>
            {...sharedProps}
        />
    );
}
