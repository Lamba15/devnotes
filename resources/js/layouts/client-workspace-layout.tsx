import { Link, usePage } from '@inertiajs/react';
import { DollarSign, FolderKanban, LayoutDashboard, LayoutGrid, ListChecks, Ticket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

type ClientWorkspaceLayoutProps = PropsWithChildren<{
    title?: string;
    description?: string;
}>;

type ClientWorkspacePageProps = {
    auth: {
        user?: {
            capabilities?: {
                platform?: boolean;
            } | null;
            portal_context?: {
                role?: 'owner' | 'admin' | 'member' | null;
                permissions?: string[];
                can_access_finance?: boolean;
                can_view_members?: boolean;
            } | null;
        } | null;
    };
    client: {
        id: number;
        name: string;
        email?: string | null;
        behavior?: {
            id: number;
            name: string;
            slug: string;
        } | null;
    };
};

const sections = (
    clientId: number,
    options: {
        canViewMembers: boolean;
        canViewProjects: boolean;
        canViewIssues: boolean;
        canViewBoards: boolean;
        canViewStatuses: boolean;
        canViewFinance: boolean;
    },
): Array<{ title: string; href: string; exact?: boolean; icon: LucideIcon }> => [
    { title: 'Overview', href: `/clients/${clientId}`, exact: true, icon: LayoutDashboard },
    ...(options.canViewMembers
        ? [{ title: 'Members', href: `/clients/${clientId}/members`, icon: Users }]
        : []),
    ...(options.canViewProjects
        ? [{ title: 'Projects', href: `/clients/${clientId}/projects`, icon: FolderKanban }]
        : []),
    ...(options.canViewIssues
        ? [{ title: 'Issues', href: `/clients/${clientId}/issues`, icon: Ticket }]
        : []),
    ...(options.canViewBoards
        ? [{ title: 'Boards', href: `/clients/${clientId}/boards`, icon: LayoutGrid }]
        : []),
    ...(options.canViewStatuses
        ? [{ title: 'Statuses', href: `/clients/${clientId}/statuses`, icon: ListChecks }]
        : []),
    ...(options.canViewFinance
        ? [{ title: 'Finance', href: `/clients/${clientId}/finance`, icon: DollarSign }]
        : []),
];

export default function ClientWorkspaceLayout({
    title,
    description,
    children,
}: ClientWorkspaceLayoutProps) {
    const { auth, client } = usePage<ClientWorkspacePageProps>().props;
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const canAccessPlatform = Boolean(auth.user?.capabilities?.platform);
    const role = auth.user?.portal_context?.role;
    const permissions = auth.user?.portal_context?.permissions ?? [];
    const hasPermission = (permission: string): boolean =>
        role === 'owner' ||
        role === 'admin' ||
        permissions.includes(permission);
    const workspaceSections = sections(client.id, {
        canViewMembers: Boolean(auth.user?.portal_context?.can_view_members) || canAccessPlatform,
        canViewProjects: hasPermission('projects.read') || hasPermission('projects.write') || canAccessPlatform,
        canViewIssues: hasPermission('issues.read') || hasPermission('issues.write') || canAccessPlatform,
        canViewBoards: hasPermission('boards.read') || hasPermission('boards.write') || canAccessPlatform,
        canViewStatuses: hasPermission('statuses.read') || hasPermission('statuses.write') || canAccessPlatform,
        canViewFinance: Boolean(auth.user?.portal_context?.can_access_finance) || canAccessPlatform,
    });

    return (
        <AppLayout>
            <div className="flex flex-1 flex-col gap-0">
                <div className="border-b border-border bg-card px-6 py-5">
                    <h1 className="text-lg font-bold">
                        {title ?? 'Workspace'}
                    </h1>
                    <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
                        <p>{description ?? 'Workspace with Nour'}</p>
                        <p>
                            {client.name}
                            {client.email ? ` · ${client.email}` : ''}
                            {client.behavior
                                ? ` · ${client.behavior.name}`
                                : ''}
                        </p>
                    </div>
                </div>

                {canAccessPlatform ? (
                    <div className="grid flex-1 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <aside className="border-b border-border bg-card p-4 lg:border-b-0 lg:border-r">
                            <nav className="space-y-1">
                                {workspaceSections.map((section) => {
                                    const active = section.exact
                                        ? isCurrentUrl(section.href)
                                        : isCurrentOrParentUrl(section.href);
                                    const Icon = section.icon;
                                    return (
                                        <Link
                                            key={section.title}
                                            href={section.href}
                                            className={cn(
                                                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                                                active
                                                    ? 'bg-accent font-semibold text-accent-foreground shadow-[inset_3px_0_0_0_var(--primary)]'
                                                    : 'text-muted-foreground hover:bg-muted',
                                            )}
                                        >
                                            <Icon className="size-4 shrink-0" />
                                            {section.title}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </aside>

                        <div className="min-w-0 p-6">{children}</div>
                    </div>
                ) : (
                    <div className="min-w-0 p-6">{children}</div>
                )}
            </div>
        </AppLayout>
    );
}
