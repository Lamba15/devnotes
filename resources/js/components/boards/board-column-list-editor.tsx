import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';

export type BoardColumnDraft = {
    id?: number;
    name: string;
    updates_status: boolean;
    mapped_status: string;
};

export function BoardColumnListEditor({
    values,
    onChange,
    statusOptions,
    addLabel = 'Add column',
}: {
    values: BoardColumnDraft[];
    onChange: (values: BoardColumnDraft[]) => void;
    statusOptions: string[];
    addLabel?: string;
}) {
    const addColumn = () => {
        onChange([
            ...values,
            {
                name: '',
                updates_status: false,
                mapped_status: statusOptions[0] ?? 'todo',
            },
        ]);
    };

    return (
        <div className="space-y-4">
            <div className="space-y-3">
                {values.map((column, index) => (
                    <div
                        key={column.id ?? `draft-${index}`}
                        className="space-y-4 rounded-xl border bg-card/60 p-4"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1 space-y-2">
                                <Label>Column name</Label>
                                <Input
                                    value={column.name}
                                    onChange={(event) => {
                                        const next = [...values];
                                        next[index] = {
                                            ...column,
                                            name: event.target.value,
                                        };
                                        onChange(next);
                                    }}
                                    placeholder="Column name"
                                />
                            </div>

                            <div className="flex shrink-0 items-center gap-1 pt-7">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={index === 0}
                                    onClick={() => {
                                        if (index === 0) {
                                            return;
                                        }

                                        const next = [...values];
                                        [next[index - 1], next[index]] = [
                                            next[index],
                                            next[index - 1],
                                        ];
                                        onChange(next);
                                    }}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={index === values.length - 1}
                                    onClick={() => {
                                        if (index === values.length - 1) {
                                            return;
                                        }

                                        const next = [...values];
                                        [next[index], next[index + 1]] = [
                                            next[index + 1],
                                            next[index],
                                        ];
                                        onChange(next);
                                    }}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </Button>
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

                        <div className="grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
                            <div className="flex items-start gap-3 rounded-lg border bg-background/60 px-3 py-3">
                                <Checkbox
                                    checked={column.updates_status}
                                    onCheckedChange={(checked) => {
                                        const next = [...values];
                                        next[index] = {
                                            ...column,
                                            updates_status: checked === true,
                                            mapped_status:
                                                checked === true
                                                    ? column.mapped_status ||
                                                      (statusOptions[0] ??
                                                          'todo')
                                                    : '',
                                        };
                                        onChange(next);
                                    }}
                                />
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">
                                        Update issue status when dropped here
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Use this for columns like Done or In
                                        progress.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Mapped status</Label>
                                <SearchableSelect
                                    className="w-full"
                                    size="default"
                                    value={
                                        column.updates_status
                                            ? column.mapped_status ||
                                              (statusOptions[0] ?? 'todo')
                                            : ''
                                    }
                                    disabled={!column.updates_status}
                                    isClearable={false}
                                    isSearchable={false}
                                    onValueChange={(value) => {
                                        const next = [...values];
                                        next[index] = {
                                            ...column,
                                            mapped_status: value,
                                        };
                                        onChange(next);
                                    }}
                                    placeholder="Select status"
                                    options={statusOptions.map((status) => ({
                                        value: status,
                                        label: status,
                                    }))}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Board-only columns leave the issue status
                                    untouched.
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Button type="button" variant="outline" onClick={addColumn}>
                <Plus className="h-4 w-4" />
                {addLabel}
            </Button>
        </div>
    );
}
