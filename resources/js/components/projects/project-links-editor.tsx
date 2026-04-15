import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ProjectLinkRow = {
    id?: number;
    label?: string | null;
    url: string;
};

type Props = {
    value: ProjectLinkRow[];
    onChange: (value: ProjectLinkRow[]) => void;
};

export function ProjectLinksEditor({ value, onChange }: Props) {
    const rows = Array.isArray(value) ? value : [];

    const update = (index: number, patch: Partial<ProjectLinkRow>) => {
        onChange(
            rows.map((row, rowIndex) =>
                rowIndex === index ? { ...row, ...patch } : row,
            ),
        );
    };

    const remove = (index: number) => {
        onChange(rows.filter((_, rowIndex) => rowIndex !== index));
    };

    const add = () => {
        onChange([...rows, { label: '', url: '' }]);
    };

    return (
        <div className="grid gap-3">
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No links yet.</p>
            ) : null}
            {rows.map((row, index) => (
                <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-border/50 p-3 md:grid-cols-[minmax(140px,1fr)_minmax(200px,2fr)_auto]"
                >
                    <Input
                        value={row.label ?? ''}
                        placeholder="Label (optional)"
                        onChange={(event) =>
                            update(index, { label: event.target.value })
                        }
                    />
                    <Input
                        value={row.url ?? ''}
                        placeholder="https://..."
                        onChange={(event) =>
                            update(index, { url: event.target.value })
                        }
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Remove link"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ))}
            <div>
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add link
                </Button>
            </div>
        </div>
    );
}
