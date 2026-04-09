import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TagListEditor({
    values,
    onChange,
}: {
    values: string[];
    onChange: (values: string[]) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {values.map((value, index) => (
                    <div
                        key={`${value}-${index}`}
                        className="flex items-center gap-2"
                    >
                        <Input
                            value={value}
                            onChange={(event) => {
                                const next = [...values];
                                next[index] = event.target.value;
                                onChange(next);
                            }}
                            placeholder="Tag"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                                onChange(
                                    values.filter(
                                        (_, itemIndex) => itemIndex !== index,
                                    ),
                                )
                            }
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange([...values, ''])}
            >
                <Plus className="h-4 w-4" />
                Add tag
            </Button>
        </div>
    );
}

type KeyValueItem = {
    label: string;
    value: string;
};

export function KeyValueListEditor({
    values,
    onChange,
    valueLabel,
    addLabel,
}: {
    values: KeyValueItem[];
    onChange: (values: KeyValueItem[]) => void;
    valueLabel: string;
    addLabel: string;
}) {
    return (
        <div className="space-y-3">
            <div className="space-y-3">
                {values.map((entry, index) => (
                    <div
                        key={`${entry.label}-${entry.value}-${index}`}
                        className="grid gap-2 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto]"
                    >
                        <Input
                            value={entry.label}
                            onChange={(event) => {
                                const next = [...values];
                                next[index] = {
                                    ...next[index],
                                    label: event.target.value,
                                };
                                onChange(next);
                            }}
                            placeholder="Label"
                        />
                        <Input
                            value={entry.value}
                            onChange={(event) => {
                                const next = [...values];
                                next[index] = {
                                    ...next[index],
                                    value: event.target.value,
                                };
                                onChange(next);
                            }}
                            placeholder={valueLabel}
                        />
                        <div className="flex items-center justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                    onChange(
                                        values.filter(
                                            (_, itemIndex) =>
                                                itemIndex !== index,
                                        ),
                                    )
                                }
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onChange([...values, { label: '', value: '' }])}
            >
                <Plus className="h-4 w-4" />
                {addLabel}
            </Button>
        </div>
    );
}
