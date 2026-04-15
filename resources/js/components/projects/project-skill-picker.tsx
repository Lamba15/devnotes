import { SearchableSelect } from '@/components/ui/searchable-select';

type SkillOption = { id: number; name: string };

type Value = Array<number | string>;

type Props = {
    value: Value;
    onChange: (value: Value) => void;
    options: SkillOption[];
};

export function ProjectSkillPicker({ value, onChange, options }: Props) {
    const stringValue = value.map((item) => String(item));
    const selectOptions = options.map((option) => ({
        value: String(option.id),
        label: option.name,
    }));

    return (
        <SearchableSelect
            name="skills"
            isMulti
            isCreatable
            isClearable
            isSearchable
            value={stringValue}
            placeholder="Pick or type skills"
            options={selectOptions}
            onValueChange={(next) => {
                const result: Value = (next as string[]).map((raw) => {
                    const match = options.find(
                        (option) => String(option.id) === raw,
                    );

                    return match ? match.id : raw;
                });
                onChange(result);
            }}
        />
    );
}
