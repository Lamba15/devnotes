import { Head, useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import type { FormEvent } from 'react';
import { BoardColumnListEditor } from '@/components/boards/board-column-list-editor';
import { CrudPage } from '@/components/crud/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useBackNavigation } from '@/hooks/use-back-navigation';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type BoardEditForm = {
    name: string;
    project_id: string;
    columns: Array<{
        id?: number;
        name: string;
        updates_status: boolean;
        mapped_status: string;
    }>;
};

export default function BoardsEdit({
    client,
    board,
    projects,
    status_options,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    board: {
        id: number;
        name: string;
        project_id: number;
        columns: Array<{
            id: number;
            name: string;
            position: number;
            updates_status: boolean;
            mapped_status: string | null;
        }>;
    };
    projects: Array<{ id: number; name: string }>;
    status_options: string[];
}) {
    const goBack = useBackNavigation(`/clients/${client.id}/boards`);
    const form = useForm<BoardEditForm>({
        name: board.name ?? '',
        project_id: board.project_id ? String(board.project_id) : '',
        columns: (board.columns ?? []).map((column) => ({
            id: column.id,
            name: column.name,
            updates_status: column.updates_status,
            mapped_status: column.mapped_status ?? 'todo',
        })),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            name: data.name,
            project_id: Number(data.project_id),
            columns: data.columns
                .map((column) => ({
                    id: column.id,
                    name: column.name.trim(),
                    updates_status: column.updates_status,
                    mapped_status: column.updates_status
                        ? column.mapped_status
                        : null,
                }))
                .filter((column) => column.name !== ''),
        }));
        form.put(`/clients/${client.id}/boards/${board.id}`);
    };

    return (
        <>
            <Head title={`Edit ${board.name}`} />
            <CrudPage
                title={`Edit ${board.name}`}
                description="Edit the board on its own page."
            >
                <form className="space-y-6" onSubmit={submit}>
                    <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold">
                                Board setup
                            </h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Keep the project association and board name in
                                sync with the workspace around it.
                            </p>
                        </div>

                        <div className="grid gap-4 rounded-xl border p-5 md:grid-cols-2">
                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="board-name">Name</Label>
                                <Input
                                    id="board-name"
                                    value={form.data.name}
                                    onChange={(event) =>
                                        form.setData('name', event.target.value)
                                    }
                                    placeholder="Board name"
                                />
                                {form.errors.name ? (
                                    <p className="text-sm text-destructive">
                                        {form.errors.name}
                                    </p>
                                ) : null}
                            </div>

                            <div className="grid gap-2 md:col-span-2">
                                <Label htmlFor="project_id">Project</Label>
                                <SearchableSelect
                                    id="project_id"
                                    name="project_id"
                                    value={form.data.project_id}
                                    onValueChange={(value) =>
                                        form.setData('project_id', value)
                                    }
                                    options={projects.map((project) => ({
                                        value: String(project.id),
                                        label: project.name,
                                    }))}
                                    placeholder="Select project"
                                />
                                {form.errors.project_id ? (
                                    <p className="text-sm text-destructive">
                                        {form.errors.project_id}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold">Columns</h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Reorder, remove, or introduce new lanes without
                                leaving the dedicated board editor.
                            </p>
                        </div>

                        <div className="rounded-xl border p-5">
                            <BoardColumnListEditor
                                values={form.data.columns}
                                onChange={(columns) =>
                                    form.setData('columns', columns)
                                }
                                statusOptions={status_options}
                                addLabel="Add another column"
                            />
                        </div>
                    </section>

                    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl border bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={goBack}
                        >
                            Back to boards
                        </Button>
                        <Button disabled={form.processing} type="submit">
                            <Check className="mr-1.5 size-4" />
                            Save board
                        </Button>
                    </div>
                </form>
            </CrudPage>
        </>
    );
}

BoardsEdit.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
