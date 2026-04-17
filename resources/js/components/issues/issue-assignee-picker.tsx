import { useMemo } from 'react';
import { SearchableSelect } from '@/components/ui/searchable-select';
import type { AssigneeOption } from '@/types/issue';

type Props = {
    id?: string;
    name?: string;
    options: AssigneeOption[];
    value: number[];
    onChange: (ids: number[]) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
};

export function IssueAssigneePicker({
    id,
    name,
    options,
    value,
    onChange,
    placeholder = 'Assign to…',
    disabled,
    className,
    size = 'default',
}: Props) {
    const sortedOptions = useMemo(() => {
        return [...options]
            .sort((a, b) => {
                if (a.is_main_owner && !b.is_main_owner) {
                    return -1;
                }

                if (!a.is_main_owner && b.is_main_owner) {
                    return 1;
                }

                return a.name.localeCompare(b.name);
            })
            .map((option) => ({
                value: String(option.id),
                label: option.is_main_owner
                    ? `${option.name} (default)`
                    : option.name,
            }));
    }, [options]);

    const stringValue = useMemo(() => value.map((id) => String(id)), [value]);

    return (
        <SearchableSelect
            id={id}
            name={name}
            isMulti
            options={sortedOptions}
            value={stringValue}
            onValueChange={(next) =>
                onChange(
                    (next as string[])
                        .map((v) => Number(v))
                        .filter((n) => Number.isFinite(n)),
                )
            }
            placeholder={placeholder}
            disabled={disabled}
            className={className}
            size={size}
            emptyMessage="No matching users."
        />
    );
}
