import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type IssueRow = {
    id: number;
    title: string;
    status: string;
    priority: string;
    type: string;
    project?: { id: number; name: string } | null;
};

export default function ClientIssuesPage({
    client,
    issues,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    issues: IssueRow[];
}) {
    const [selectedIssueIds, setSelectedIssueIds] = useState<
        Array<string | number>
    >([]);

    const columns: DataTableColumn<IssueRow>[] = [
        {
            key: 'title',
            header: 'Title',
            render: (issue) => (
                <Link
                    href={`/clients/${client.id}/projects/${issue.project?.id}/issues/${issue.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {issue.title}
                </Link>
            ),
        },
        {
            key: 'project',
            header: 'Project',
            render: (issue) =>
                issue.project ? (
                    <Link
                        href={`/clients/${client.id}/projects/${issue.project.id}/issues`}
                        className="underline-offset-4 hover:underline"
                    >
                        {issue.project.name}
                    </Link>
                ) : (
                    '—'
                ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (issue) => issue.status,
        },
        {
            key: 'priority',
            header: 'Priority',
            render: (issue) => issue.priority,
        },
        {
            key: 'type',
            header: 'Type',
            render: (issue) => issue.type,
        },
    ];

    return (
        <>
            <Head title={`${client.name} Issues`} />
            <div className="space-y-6">
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle>Issues across this client</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This view brings together issues across the client
                        projects. Project-specific issue detail and discussion
                        still live inside each project.
                    </CardContent>
                </Card>

                <DataTable
                    columns={columns}
                    rows={issues}
                    emptyText="No issues for this client yet."
                    getRowId={(issue) => issue.id}
                    selectedRowIds={selectedIssueIds}
                    onSelectedRowIdsChange={setSelectedIssueIds}
                />
            </div>
        </>
    );
}

ClientIssuesPage.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
