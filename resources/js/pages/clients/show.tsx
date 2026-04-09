import { Head, Link } from '@inertiajs/react';
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
        user: { id: number; name: string; email: string };
    }>;
    can_edit_internal_client_profile: boolean;
    can_view_internal_client_profile: boolean;
}) {
    return (
        <>
            <Head title={client.name} />

            <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                        ['Members', summary.members_count],
                        ['Projects', summary.projects_count],
                        ['Issues', summary.issues_count],
                        ['Boards', summary.boards_count],
                        ['Statuses', summary.statuses_count],
                    ].map(([label, value]) => (
                        <Card key={label} className="shadow-none">
                            <CardContent className="p-4">
                                <p className="text-sm text-muted-foreground">
                                    {label}
                                </p>
                                <p className="mt-2 text-2xl font-semibold">
                                    {value}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                    <Card className="shadow-none">
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                            <CardTitle>
                                {can_view_internal_client_profile
                                    ? 'Client profile'
                                    : 'Workspace details'}
                            </CardTitle>
                            {can_edit_internal_client_profile ? (
                                <Link href={`/clients/${client.id}/edit`}>
                                    <Button>Edit client</Button>
                                </Link>
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
                                    recent_members.map((membership) => (
                                        <div
                                            key={membership.id}
                                            className="rounded-lg border px-3 py-2"
                                        >
                                            <p className="font-medium">
                                                {membership.user.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {membership.user.email} ·{' '}
                                                {membership.role}
                                            </p>
                                        </div>
                                    ))
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
