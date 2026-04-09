import { Head, Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

export default function ProjectShow({
    client,
    project,
    summary,
    can_manage_project,
}: {
    client: { id: number; name: string };
    project: {
        id: number;
        name: string;
        description: string | null;
        status?: { id: number; name: string; slug: string } | null;
    };
    summary: {
        issues_count: number;
        boards_count: number;
    };
    can_manage_project: boolean;
}) {
    return (
        <>
            <Head title={project.name} />

            <div className="space-y-6">
                <Card className="shadow-none">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                        <div className="space-y-1">
                            <CardTitle>{project.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {client.name} / Project workspace
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {can_manage_project ? (
                                <Link
                                    href={`/clients/${client.id}/projects/${project.id}/issues/create`}
                                >
                                    <Button>Create issue</Button>
                                </Link>
                            ) : null}
                            {can_manage_project ? (
                                <Link
                                    href={`/clients/${client.id}/projects/${project.id}/edit`}
                                >
                                    <Button variant="outline">Edit project</Button>
                                </Link>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <ProjectField label="Status" value={project.status?.name ?? 'No status'} />
                        <ProjectField
                            label="Description"
                            value={project.description ?? 'No description yet.'}
                            fullWidth
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Card className="shadow-none">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Issues</p>
                            <p className="mt-2 text-2xl font-semibold">
                                {summary.issues_count}
                            </p>
                            <Link
                                href={`/clients/${client.id}/projects/${project.id}/issues`}
                                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Open issues
                            </Link>
                        </CardContent>
                    </Card>

                    <Card className="shadow-none">
                        <CardContent className="p-4">
                            <p className="text-sm text-muted-foreground">Boards</p>
                            <p className="mt-2 text-2xl font-semibold">
                                {summary.boards_count}
                            </p>
                            <Link
                                href={`/clients/${client.id}/boards`}
                                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                            >
                                Open client boards
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function ProjectField({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value: string;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                {value}
            </p>
        </div>
    );
}

ProjectShow.layout = (page: React.ReactNode) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
