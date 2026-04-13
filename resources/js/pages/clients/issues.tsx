import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Bug,
    CheckCircle2,
    Circle,
    Flame,
    Lightbulb,
    ListTodo,
    Loader2,
    Minus,
    Plus,
    Ticket,
} from 'lucide-react';
import { useState } from 'react';
import { DataTable } from '@/components/crud/data-table';
import type { DataTableColumn } from '@/components/crud/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    creatable_projects,
}: {
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: { id: number; name: string; slug: string } | null;
    };
    issues: IssueRow[];
    creatable_projects: Array<{ id: number; name: string }>;
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
            render: (issue) => {
                const cfg: Record<
                    string,
                    { icon: typeof Circle; color: string }
                > = {
                    todo: { icon: Circle, color: 'text-muted-foreground' },
                    in_progress: { icon: Loader2, color: 'text-blue-500' },
                    done: { icon: CheckCircle2, color: 'text-emerald-500' },
                };
                const c = cfg[issue.status] ?? cfg.todo;
                const Icon = c.icon;
                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
                        {issue.status.replace('_', ' ')}
                    </Badge>
                );
            },
        },
        {
            key: 'priority',
            header: 'Priority',
            render: (issue) => {
                const cfg: Record<
                    string,
                    { icon: typeof Minus; color: string }
                > = {
                    low: { icon: Minus, color: 'text-muted-foreground' },
                    medium: { icon: AlertTriangle, color: 'text-amber-500' },
                    high: { icon: Flame, color: 'text-red-500' },
                };
                const c = cfg[issue.priority] ?? cfg.medium;
                const Icon = c.icon;
                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
                        {issue.priority}
                    </Badge>
                );
            },
        },
        {
            key: 'type',
            header: 'Type',
            render: (issue) => {
                const cfg: Record<
                    string,
                    { icon: typeof ListTodo; color: string }
                > = {
                    task: { icon: ListTodo, color: 'text-blue-500' },
                    bug: { icon: Bug, color: 'text-red-500' },
                    feature: { icon: Lightbulb, color: 'text-violet-500' },
                };
                const c = cfg[issue.type] ?? cfg.task;
                const Icon = c.icon;
                return (
                    <Badge variant="outline" className="gap-1 capitalize">
                        <Icon className={`size-3 ${c.color}`} />
                        {issue.type}
                    </Badge>
                );
            },
        },
    ];

    return (
        <>
            <Head title={`${client.name} Issues`} />
            <div className="space-y-6">
                <Card className="shadow-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Ticket className="size-5 text-amber-500" />
                            Issues across this client
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                        This view brings together issues across the client
                        projects. Project-specific issue detail and discussion
                        still live inside each project.
                    </CardContent>
                </Card>

                {creatable_projects.length > 0 ? (
                    <Card className="shadow-none">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="size-5 text-primary" />
                                Create issue
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Start a new issue from here and drop into the
                                right project create flow.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {creatable_projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        href={`/clients/${client.id}/projects/${project.id}/issues/create`}
                                    >
                                        <Button variant="outline">
                                            <Plus className="mr-1.5 size-4" />
                                            {project.name}
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

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
