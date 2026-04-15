import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ProjectGitRepoRow = {
    id?: number;
    name: string;
    repo_url: string;
    wakatime_badge_url?: string | null;
};

type Props = {
    value: ProjectGitRepoRow[];
    onChange: (value: ProjectGitRepoRow[]) => void;
};

export function ProjectGitReposEditor({ value, onChange }: Props) {
    const rows = Array.isArray(value) ? value : [];

    const update = (index: number, patch: Partial<ProjectGitRepoRow>) => {
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
        onChange([...rows, { name: '', repo_url: '', wakatime_badge_url: '' }]);
    };

    return (
        <div className="grid gap-3">
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No repositories yet.
                </p>
            ) : null}
            {rows.map((row, index) => (
                <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-border/50 p-3 md:grid-cols-[minmax(140px,1fr)_minmax(200px,2fr)_minmax(200px,2fr)_auto]"
                >
                    <Input
                        value={row.name ?? ''}
                        placeholder="Repo name"
                        onChange={(event) =>
                            update(index, { name: event.target.value })
                        }
                    />
                    <Input
                        value={row.repo_url ?? ''}
                        placeholder="https://github.com/..."
                        onChange={(event) =>
                            update(index, { repo_url: event.target.value })
                        }
                    />
                    <Input
                        value={row.wakatime_badge_url ?? ''}
                        placeholder="Wakatime badge URL (optional)"
                        onChange={(event) =>
                            update(index, {
                                wakatime_badge_url: event.target.value,
                            })
                        }
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        aria-label="Remove repository"
                    >
                        <Trash2 className="size-4" />
                    </Button>
                </div>
            ))}
            <div>
                <Button type="button" variant="outline" size="sm" onClick={add}>
                    <Plus className="mr-1.5 size-3.5" />
                    Add repository
                </Button>
            </div>
        </div>
    );
}
