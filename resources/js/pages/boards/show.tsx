import { Head } from '@inertiajs/react';
import { CrudPage } from '@/components/crud/crud-page';
import AppLayout from '@/layouts/app-layout';

type Issue = {
    id: number;
    title: string;
    status: string;
    priority: string;
    type: string;
};

type Column = {
    id: number;
    name: string;
    issues: Issue[];
};

export default function BoardShow({
    client,
    project,
    board,
    backlog,
    columns,
    can_move_issues,
}: {
    client: { id: number; name: string };
    project: { id: number; name: string };
    board: { id: number; name: string };
    backlog: Issue[];
    columns: Column[];
    can_move_issues: boolean;
}) {
    const moveIssue = async (issueId: number, columnId: number) => {
        const csrfToken =
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.getAttribute('content') ?? '';

        const formData = new FormData();
        formData.set('issue_id', String(issueId));
        formData.set('column_id', String(columnId));

        await fetch(`/boards/${board.id}/issues/move`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                'X-Requested-With': 'XMLHttpRequest',
            },
            body: formData,
        });

        window.location.reload();
    };

    return (
        <>
            <Head title={`${board.name}`} />
            <CrudPage
                title={board.name}
                description={`${client.name} / ${project.name}`}
            >
                <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <section className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border">
                        <h2 className="text-lg font-semibold">Backlog</h2>
                        <div className="mt-4 space-y-3">
                            {backlog.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No backlog issues.</p>
                            ) : (
                                backlog.map((issue) => (
                                    <div key={issue.id} className="rounded-lg border bg-background px-3 py-2">
                                        <p className="font-medium">{issue.title}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {issue.status} / {issue.priority} / {issue.type}
                                        </p>
                                        {can_move_issues ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {columns.map((column) => (
                                                    <button
                                                        key={`${issue.id}-${column.id}`}
                                                        type="button"
                                                        className="rounded-md border px-2 py-1 text-xs"
                                                        onClick={() => moveIssue(issue.id, column.id)}
                                                    >
                                                        Move to {column.name}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-3">
                        {columns.map((column) => (
                            <div
                                key={column.id}
                                className="rounded-xl border border-sidebar-border/70 p-4 dark:border-sidebar-border"
                            >
                                <h2 className="text-lg font-semibold">{column.name}</h2>
                                <div className="mt-4 space-y-3">
                                    {column.issues.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No issues in this column.</p>
                                    ) : (
                                        column.issues.map((issue) => (
                                            <div key={issue.id} className="rounded-lg border bg-background px-3 py-2">
                                                <p className="font-medium">{issue.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {issue.status} / {issue.priority} / {issue.type}
                                                </p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ))}
                    </section>
                </div>
            </CrudPage>
        </>
    );
}

BoardShow.layout = (page: React.ReactNode) => <AppLayout>{page}</AppLayout>;
