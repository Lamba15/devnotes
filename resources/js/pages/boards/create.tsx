import { Head, router, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';
import { BoardColumnListEditor } from '@/components/boards/board-column-list-editor';
import { CrudPage } from '@/components/crud/crud-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type BoardCreateForm = {
    name: string;
    project_id: string;
    columns: Array<{
        name: string;
        updates_status: boolean;
        mapped_status: string;
    }>;
};

export default function BoardsCreate({
    client,
    projects,
    status_options,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    projects: Array<{ id: number; name: string }>;
    status_options: string[];
}) {
    const form = useForm<BoardCreateForm>({
        name: '',
        project_id: '',
        columns: [
            {
                name: 'Backlog lane',
                updates_status: false,
                mapped_status: 'todo',
            },
            {
                name: 'In progress',
                updates_status: true,
                mapped_status: 'in_progress',
            },
            {
                name: 'Done',
                updates_status: true,
                mapped_status: 'done',
            },
        ],
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.transform((data) => ({
            name: data.name,
            project_id: Number(data.project_id),
            columns: data.columns
                .map((column) => ({
                    name: column.name.trim(),
                    updates_status: column.updates_status,
                    mapped_status: column.updates_status
                        ? column.mapped_status
                        : null,
                }))
                .filter((column) => column.name !== ''),
        }));
        form.post(`/clients/${client.id}/boards`);
    };

    return (
        <>
            <Head title={`${client.name} Create Board`} />
            <CrudPage
                title={`Create ${client.name} Board`}
                description="Create a board on its own page without falling back to inline management."
            >
                <form className="space-y-6" onSubmit={submit}>
                    <section className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
                        <div className="space-y-2">
                            <h3 className="text-base font-semibold">
                                Board setup
                            </h3>
                            <p className="text-sm leading-6 text-muted-foreground">
                                Create the board and attach it to the project it
                                should organize.
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
                                Define the lanes now so the board feels ready on
                                first open.
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
                            onClick={() =>
                                router.visit(`/clients/${client.id}/boards`)
                            }
                        >
                            Back to boards
                        </Button>
                        <Button disabled={form.processing} type="submit">
                            Create board
                        </Button>
                    </div>
                </form>
            </CrudPage>
        </>
    );
}

BoardsCreate.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
