import { Head, Link } from '@inertiajs/react';
import {
    Camera,
    Banknote,
    LayoutGrid,
    Pencil,
    Plus,
    Ticket,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SecretsCard from '@/components/secrets/secrets-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';
import { formatCurrencyAmount } from '@/lib/format-currency';

export default function ProjectShow({
    client,
    project,
    secrets,
    summary,
    can_manage_project,
    can_manage_secrets,
}: {
    client: { id: number; name: string };
    project: {
        id: number;
        name: string;
        description: string | null;
        status?: { id: number; name: string; slug: string } | null;
        budget?: string | null;
        currency?: string | null;
        image_path?: string | null;
    };
    secrets: Array<{
        id: number;
        label: string;
        description: string | null;
        updated_at: string | null;
    }>;
    summary: {
        issues_count: number;
        boards_count: number;
    };
    can_manage_project: boolean;
    can_manage_secrets: boolean;
}) {
    return (
        <>
            <Head title={project.name} />

            <div className="space-y-6">
                <Card className="shadow-none">
                    <CardHeader className="flex-row items-start justify-between space-y-0">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-12">
                                    {project.image_path ? (
                                        <AvatarImage
                                            src={`/storage/${project.image_path}`}
                                            alt={project.name}
                                        />
                                    ) : null}
                                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                        {project.name
                                            .split(' ')
                                            .map((part) => part[0])
                                            .slice(0, 2)
                                            .join('')
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="space-y-1">
                                    <CardTitle>{project.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {client.name} / Project workspace
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {can_manage_project ? (
                                <Link
                                    href={`/clients/${client.id}/projects/${project.id}/edit`}
                                >
                                    <Button variant="outline">
                                        <Camera className="mr-1.5 size-3.5" />
                                        {project.image_path ? 'Update logo' : 'Add logo'}
                                    </Button>
                                </Link>
                            ) : null}
                            {can_manage_project ? (
                                <Link
                                    href={`/clients/${client.id}/projects/${project.id}/issues/create`}
                                >
                                    <Button>
                                        <Plus className="mr-1.5 size-4" />
                                        Create issue
                                    </Button>
                                </Link>
                            ) : null}
                            {can_manage_project ? (
                                <Link
                                    href={`/clients/${client.id}/projects/${project.id}/edit`}
                                >
                                    <Button variant="outline">
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit project
                                    </Button>
                                </Link>
                            ) : null}
                        </div>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Status</p>
                            <div className="mt-1">
                                <Badge variant="outline" className="capitalize">
                                    {project.status?.name ?? 'No status'}
                                </Badge>
                            </div>
                        </div>
                        {project.budget ? (
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Budget</p>
                                <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-foreground">
                                    <Banknote className="size-3.5 text-emerald-500" />
                                    {formatCurrencyAmount(project.budget, project.currency)}
                                </p>
                            </div>
                        ) : null}
                        <ProjectField
                            label="Description"
                            value={project.description ?? 'No description yet.'}
                            fullWidth
                        />
                    </CardContent>
                </Card>

                <div className="grid gap-4 sm:grid-cols-2">
                    {[
                        {
                            label: 'Issues',
                            value: summary.issues_count,
                            icon: Ticket,
                            color: 'text-amber-600 dark:text-amber-400',
                            href: `/clients/${client.id}/projects/${project.id}/issues`,
                            linkLabel: 'Open issues',
                        },
                        {
                            label: 'Boards',
                            value: summary.boards_count,
                            icon: LayoutGrid,
                            color: 'text-emerald-600 dark:text-emerald-400',
                            href: `/clients/${client.id}/boards`,
                            linkLabel: 'Open client boards',
                        },
                    ].map((stat) => {
                        const Icon = stat.icon;
                        return (
                            <Card key={stat.label} className="shadow-none">
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${stat.color}`}>
                                            <Icon className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                                            <p className="text-2xl font-semibold">{stat.value}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={stat.href}
                                        className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                    >
                                        {stat.linkLabel}
                                    </Link>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
                {can_manage_secrets ? (
                    <SecretsCard
                        title="Secrets"
                        description="Platform-only credentials and private values for this project."
                        secrets={secrets}
                        createHref={`/clients/${client.id}/projects/${project.id}/secrets/create`}
                        editHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}/edit`}
                        deleteHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}`}
                        revealHref={(secretId) => `/clients/${client.id}/projects/${project.id}/secrets/${secretId}/reveal`}
                    />
                ) : null}
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
