import { Head, Link } from '@inertiajs/react';
import {
    FolderKanban,
    LayoutGrid,
    ListChecks,
    Pencil,
    Ticket,
    Users,
} from 'lucide-react';
import SecretsCard from '@/components/secrets/secrets-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ClientWorkspaceLayout from '@/layouts/client-workspace-layout';

type ClientShape = {
    id: number;
    name: string;
    email: string | null;
    behavior?: { id: number; name: string; slug: string } | null;
    image_path: string | null;
    country_of_origin: string | null;
    industry: string | null;
    address: string | null;
    birthday: string | null;
    date_of_first_interaction: string | null;
    origin: string | null;
    notes: string | null;
    social_links: Array<{ label?: string | null; url?: string | null }>;
    phone_numbers: Array<{ id: number; label?: string | null; number: string }>;
    tags: string[];
};

export default function ClientShow({
    client,
    summary,
    recent_projects,
    recent_members,
    secrets,
    can_manage_members,
    can_manage_secrets,
    can_edit_internal_client_profile,
    can_view_internal_client_profile,
}: {
    client: ClientShape;
    summary: {
        members_count: number;
        projects_count: number;
        issues_count: number;
        boards_count: number;
        statuses_count: number;
    };
    recent_projects: Array<{
        id: number;
        name: string;
        status?: { id: number; name: string; slug: string } | null;
    }>;
    recent_members: Array<{
        id: number;
        role: string;
        user: { id: number; name: string; email: string; avatar_path?: string | null };
    }>;
    secrets: Array<{
        id: number;
        label: string;
        description: string | null;
        updated_at: string | null;
    }>;
    can_manage_members: boolean;
    can_manage_secrets: boolean;
    can_edit_internal_client_profile: boolean;
    can_view_internal_client_profile: boolean;
}) {
    return (
        <>
            <Head title={client.name} />

            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        { label: 'Members', value: summary.members_count, icon: Users, color: 'text-blue-600 dark:text-blue-400' },
                        { label: 'Projects', value: summary.projects_count, icon: FolderKanban, color: 'text-violet-600 dark:text-violet-400' },
                        { label: 'Issues', value: summary.issues_count, icon: Ticket, color: 'text-amber-600 dark:text-amber-400' },
                        { label: 'Boards', value: summary.boards_count, icon: LayoutGrid, color: 'text-emerald-600 dark:text-emerald-400' },
                        { label: 'Statuses', value: summary.statuses_count, icon: ListChecks, color: 'text-pink-600 dark:text-pink-400' },
                    ].map((stat) => {
                        const Icon = stat.icon;

                        return (
                            <Card key={stat.label} className="shadow-none">
                                <CardContent className="flex items-center gap-3 p-4">
                                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted ${stat.color}`}>
                                        <Icon className="size-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">{stat.label}</p>
                                        <p className="text-2xl font-semibold">{stat.value}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <div className="flex items-center gap-3">
                                <Avatar className="size-10">
                                    {client.image_path && (
                                        <AvatarImage
                                            src={`/storage/${client.image_path}`}
                                            alt={client.name}
                                        />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                                        {client.name
                                            .split(' ')
                                            .map((p) => p[0])
                                            .slice(0, 2)
                                            .join('')
                                            .toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <CardTitle>
                                    {can_view_internal_client_profile
                                        ? 'Client profile'
                                        : 'Workspace details'}
                                </CardTitle>
                            </div>
                            {can_edit_internal_client_profile ? (
                                <Button asChild size="sm">
                                    <Link href={`/clients/${client.id}/edit`}>
                                        <Pencil className="mr-1.5 size-3.5" />
                                        Edit client
                                    </Link>
                                </Button>
                            ) : null}
                        </CardHeader>
                        <CardContent className="grid gap-4 sm:grid-cols-2">
                            <ProfileField label="Name" value={client.name} />
                            <ProfileField label="Email" value={client.email} />
                            {can_view_internal_client_profile ? (
                                <>
                                    <ProfileField
                                        label="Behavior"
                                        value={client.behavior?.name ?? null}
                                    />
                                    <ProfileField
                                        label="Industry"
                                        value={client.industry}
                                    />
                                    <ProfileField
                                        label="Country of origin"
                                        value={client.country_of_origin}
                                    />
                                    <ProfileField
                                        label="First met"
                                        value={client.date_of_first_interaction}
                                    />
                                    <ProfileField
                                        label="Birthday"
                                        value={client.birthday}
                                    />
                                    <ProfileField
                                        label="Origin"
                                        value={client.origin}
                                    />
                                    <ProfileField
                                        label="Tags"
                                        value={client.tags.join(', ') || null}
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Phone numbers"
                                        value={
                                            client.phone_numbers
                                                .map((phone) =>
                                                    [phone.label, phone.number]
                                                        .filter(Boolean)
                                                        .join(': '),
                                                )
                                                .join('\n') || null
                                        }
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Social links"
                                        value={
                                            client.social_links
                                                .map((link) =>
                                                    [link.label, link.url]
                                                        .filter(Boolean)
                                                        .join(': '),
                                                )
                                                .join('\n') || null
                                        }
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Address"
                                        value={client.address}
                                        fullWidth
                                    />
                                    <ProfileField
                                        label="Notes"
                                        value={client.notes}
                                        fullWidth
                                    />
                                </>
                            ) : (
                                <ProfileField
                                    label="Workspace note"
                                    value="This workspace is scoped for collaboration and project work. Internal relationship notes and owner-side classifications are not exposed here."
                                    fullWidth
                                />
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid gap-6">
                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Recent members</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recent_members.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No client members yet.
                                    </p>
                                ) : (
                                    recent_members.map((membership) => {
                                        const avatarSrc = membership.user.avatar_path
                                            ? `/storage/${membership.user.avatar_path}`
                                            : null;

                                        return (
                                            <div
                                                key={membership.id}
                                                className="flex items-center gap-3 rounded-lg border px-3 py-2"
                                            >
                                                <Avatar className="size-8">
                                                    {avatarSrc && (
                                                        <AvatarImage
                                                            src={avatarSrc}
                                                            alt={membership.user.name}
                                                        />
                                                    )}
                                                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                                                        {membership.user.name
                                                            .split(' ')
                                                            .map((p: string) => p[0])
                                                            .slice(0, 2)
                                                            .join('')
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 flex-1">
                                                    {can_manage_members ? (
                                                        <Link
                                                            href={`/clients/${client.id}/members/${membership.id}`}
                                                            className="font-medium underline-offset-4 hover:underline"
                                                        >
                                                            {membership.user.name}
                                                        </Link>
                                                    ) : (
                                                        <p className="font-medium">
                                                            {membership.user.name}
                                                        </p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">
                                                        {membership.user.email} ·{' '}
                                                        <Badge variant="outline" className="text-[10px] capitalize">
                                                            {membership.role}
                                                        </Badge>
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <Link
                                    href={`/clients/${client.id}/members`}
                                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Open members
                                </Link>
                            </CardContent>
                        </Card>

                        <Card className="shadow-none">
                            <CardHeader>
                                <CardTitle>Recent projects</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {recent_projects.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        No projects yet.
                                    </p>
                                ) : (
                                    recent_projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="rounded-lg border px-3 py-2"
                                        >
                                            <Link
                                                href={`/clients/${client.id}/projects/${project.id}`}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {project.name}
                                            </Link>
                                            <p className="text-sm text-muted-foreground">
                                                {project.status?.name ??
                                                    'No status'}
                                            </p>
                                        </div>
                                    ))
                                )}
                                <Link
                                    href={`/clients/${client.id}/projects`}
                                    className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                                >
                                    Open projects
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
                {can_manage_secrets ? (
                    <SecretsCard
                        title="Secrets"
                        description="Platform-only credentials and private values for this client."
                        secrets={secrets}
                        createHref={`/clients/${client.id}/secrets/create`}
                        editHref={(secretId) => `/clients/${client.id}/secrets/${secretId}/edit`}
                        deleteHref={(secretId) => `/clients/${client.id}/secrets/${secretId}`}
                        revealHref={(secretId) => `/clients/${client.id}/secrets/${secretId}/reveal`}
                    />
                ) : null}
            </div>
        </>
    );
}

function ProfileField({
    label,
    value,
    fullWidth = false,
}: {
    label: string;
    value: string | null;
    fullWidth?: boolean;
}) {
    return (
        <div className={fullWidth ? 'sm:col-span-2' : ''}>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-foreground">
                {value || '—'}
            </p>
        </div>
    );
}

ClientShow.layout = (page: any) => (
    <ClientWorkspaceLayout>{page}</ClientWorkspaceLayout>
);
